const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const express = require('express')
const exec = require('child_process').exec
const moment = require('moment')
const SpacebroClient = require('spacebro-client').SpacebroClient
const standardSettings = require('standard-settings')
const packageInfos = require('./package.json')
const uniquefilename = require('uniquefilename')
const download = require('download')
const { promisify } = require('util')
const access = promisify(fs.access)
const assignment = require('assignment')
const deepIterator = require('deep-iterator').default
const validUrl = require('valid-url')
const filenamify = require('filenamify')

const settings = standardSettings.getSettings()

const recipes = require('./recipes')

mkdirp.sync(settings.folder.output)
mkdirp.sync(settings.folder.tmp)

let filename
if (process.argv.indexOf('-f') !== -1) {
  // does our flag exist?
  filename = process.argv[process.argv.indexOf('-f') + 1] // grab the next item
  const jsonfile = JSON.parse(fs.readFileSync(filename, 'utf8'))
  if (jsonfile.edit.input && jsonfile.edit.output) {
    const proc = ffmpeg()
      .audioCodec('libmp3lame')
      .on('end', function () {
        console.log('files have been merged succesfully')
      })
      .on('error', function (err, stdout, stderr) {
        console.error('an error happened: ' + err.message, stdout, stderr)
      })
      .on('start', function (commandLine) {
        console.log('Spawned Ffmpeg with command: ' + commandLine)
      })
    jsonfile.edit.input.forEach(function (file) {
      proc.input(path.join(path.dirname(filename), file))
    })
    proc.mergeToFile(path.join(path.dirname(filename), jsonfile.edit.output))
  }
} else {
  // console.log("Mention a json file: node index.js -f example/edit.json")
  // process.exit(1)
}

let lastCommand

// init static server to serve generated files
const app = express()
app.use(express.static(settings.folder.output))

const stateServe = require('./src/state-serve')
stateServe.init(app, {
  app: {
    name: packageInfos.name,
    version: packageInfos.version,
    site: {
      url: packageInfos.repository.url,
      name: packageInfos.name
    }
  }
})

app.listen(process.env.PORT || settings.server.port)

/*
var spacebroClient = new SpacebroClient(settings.service.spacebro.host, settings.service.spacebro.port, {
  channelName: settings.service.spacebro.channelName,
  client: settings.service.spacebro.client,
  verbose: false,
  sendBack: false
})
*/
const spacebroClient = new SpacebroClient()

console.log(
  `Connecting to spacebro on ${settings.service.spacebro.host}:${settings.service.spacebro.port}`
)

spacebroClient.on('connect', () => {
  console.log(
    `spacebro: ${settings.service.spacebro.client.name} connected to ${settings.service.spacebro.host}:${settings.service.spacebro.port}#${settings.service.spacebro.channelName}`
  )
})

spacebroClient.on('newClient', (data) => {
  console.log(`spacebro: ${data.name} has joined.`)
})

spacebroClient.on('disconnect', () => {
  console.error('spacebro: connection lost.')
})

const sendMedia = function (data) {
  if (
    data.input &&
    data.input.includes &&
    data.input.includes(settings.folder.tmpDownload)
  ) {
    fs.unlink(data.input, () => {})
  }
  delete data.input
  delete data.output
  delete data.outputTempPath
  spacebroClient.emit(
    settings.service.spacebro.client.out.outVideo.eventName,
    data
  )
  console.log(data)
}

const getDuration = (path) => {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(path, function (err, metadata) {
      if (err) {
        resolve(0)
      } else {
        resolve(metadata.format.duration)
      }
    })
  })
}

const downloadWithCache = async function (url) {
  const filename = filenamify(url)
  const filepath = path.join(settings.folder.tmpDownload, filename)
  if (!settings.cache) {
    console.log('downloading ' + url)
    await download(url, settings.folder.tmpDownload, { filename })
  } else {
    let exists = false
    try {
      await access(filepath)
      exists = true
    } catch (err) {
      exists = false
    }
    if (!exists) {
      console.log('downloading ' + url)
      try {
        await download(url, settings.folder.tmpDownload, { filename })
      } catch (err) {
        console.error('an error occured while downloading with cache')
        throw err
      }
    } else {
      console.log('in cache: ' + url)
    }
  }
  return filepath
}

const downloadFile = async function (data) {
  if (data.url) {
    let exists = false
    if (data.path) {
      try {
        await access(data.path)
        exists = true
      } catch (e) {
        exists = false
      }
    }
    if (!exists) {
      try {
        data.path = await downloadWithCache(data.url)
      } catch (e) {
        console.log(e)
      }
    }
  }
  return data
}

const downloadFilesInMeta = async function (data) {
  const values = data.meta
  for (const { parent, key, value } of deepIterator(values)) {
    if (
      key !== 'mjpgStream' &&
      key !== 'baseURL' &&
      value &&
      typeof value === 'string' &&
      validUrl.isUri(value)
    ) {
      try {
        const filepath = await downloadWithCache(value)
        parent[key] = filepath
      } catch (e) {
        console.log(e)
      }
    }
  }
  return data
}

const setFilenames = async function (data) {
  if (data.path && typeof data.input !== 'string') {
    data.input = data.path
  }
  if (data.input) {
    data.output =
      data.output ||
      path.join(settings.folder.output, path.basename(data.input))
    data.output += '.mp4'
  } else {
    if (!data.output) {
      const date = moment()
      const timestampName = date.format('YYYY-MM-DDTHH-mm-ss-SSS') + '.mp4'
      data.output = path.join(
        settings.folder.output,
        path.basename(timestampName)
      )
    }
  }
  data.output = await uniquefilename.get(data.output)
  data.outputTempPath =
    data.outputTempPath ||
    path.join(settings.folder.tmp, path.basename(data.output))
  return data
}

const isImage = (data) => {
  if (data.filename) {
    if (data.filename.match(/png$/)) {
      return true
    }
  }
  return false
}

const onInputReceived = async (data) => {
  try {
    console.log(
      `Received event ${
        settings.service.spacebro.client.in.inMedia.eventName
      }, new media: ${JSON.stringify(data)}`
    )
    if (settings.minDuration) {
      const duration = await getDuration(data.path)
      if (duration < settings.minDuration) {
        throw Error('File too small to be processed: ' + duration + ' seconds')
      }
    }
    if (isImage(data)) {
      console.log('Image, pass through, send media without changes')
      sendMedia(data)
      return
    }
    // data = assignment(data, JSON.parse(JSON.stringify(settings.media)))
    data = assignment(JSON.parse(JSON.stringify(settings.media)), data)
    // save input in meta
    if (data.meta === undefined) {
      data.meta = {}
    }
    const etnaInput = JSON.parse(JSON.stringify(data))
    // download
    // removing this function allow to use the default recipe. This might
    // breaks something else.
    delete data.input
    data = await downloadFile(data)
    for (const key in data.details) {
      await downloadFile(data.details[key])
    }
    data = await downloadFilesInMeta(data)
    // process
    data = await setFilenames(data)
    data.meta.etnaInput = etnaInput
    const recipe = data.recipe || settings.recipe
    const recipeFn = recipes.recipe(recipe)
    lastCommand = recipeFn(data, function () {
      // fs.rename(data.outputTempPath, data.output, function (err) {
      if (recipe !== 'addThumbnail') {
        exec('mv ' + data.outputTempPath + ' ' + data.output, function (err) {
          if (err) {
            console.error('an error occured', err)
          } else {
            console.log('finished processing ' + data.output)
            data.type = 'video/' + path.extname(data.output).substring(1)
            data.path = data.output
            data.file = path.basename(data.output)
            data.url = `http://${settings.server.host}:${
              settings.server.port
            }/${path.basename(data.output)}`
            const meta = standardSettings.getMeta(data)
            if (meta.thumbnail) {
              data.input = data.output
              recipes.recipe('addThumbnail')(data, () => {
                sendMedia(data)
              })
            } else {
              sendMedia(data)
            }
          }
        })
      } else {
        sendMedia(data)
      }
    })
  } catch (error) {
    console.error(error)
  }
}

// TODO: document 'new-media' data.recipe, data.input, data.output
// add data.options, like the path for an image to watermark, framerate, ...
spacebroClient.on(
  settings.service.spacebro.client.in.inMedia.eventName,
  (data) => {
    onInputReceived(data)
  }
)

spacebroClient.on(
  settings.service.spacebro.client.in.stopLastProcess.eventName,
  function (data) {
    console.log('kill')
    if (lastCommand) {
      lastCommand.kill('SIGINT')
    }
  }
)
