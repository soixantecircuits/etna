var ffmpeg = require('fluent-ffmpeg')
var fs = require('fs')
var path = require('path')
// var config = require('./config.json')
var mkdirp = require('mkdirp')
var express = require('express')
var exec = require('child_process').exec
var moment = require('moment')
const SpacebroClient = require('spacebro-client').SpacebroClient
var standardSettings = require('standard-settings')
var packageInfos = require('./package.json')
var uniquefilename = require('uniquefilename')
const download = require('download')
const {promisify} = require('util')
const access = promisify(fs.access)
const assignment = require('assignment')
const deepIterator = require('deep-iterator').default
const validUrl = require('valid-url')
const filenamify = require('filenamify')

var settings = standardSettings.getSettings()

var recipes = require('./recipes')

mkdirp(settings.folder.output)
mkdirp(settings.folder.tmp)

var filename
if (process.argv.indexOf('-f') !== -1) { // does our flag exist?
  filename = process.argv[process.argv.indexOf('-f') + 1] // grab the next item
  var jsonfile = JSON.parse(fs.readFileSync(filename, 'utf8'))
  if (jsonfile['edit']['input'] && jsonfile['edit']['output']) {
    var proc = ffmpeg()
      .audioCodec('libmp3lame')
      .on('end', function () {
        console.log('files have been merged succesfully')
      })
      .on('error', function (err, stdout, stderr) {
        console.log('an error happened: ' + err.message, stdout, stderr)
      })
      .on('start', function (commandLine) {
        console.log('Spawned Ffmpeg with command: ' + commandLine)
      })
    jsonfile.edit.input.forEach(function (file) {
      proc.input(path.join(path.dirname(filename), file))
    })
    proc.mergeToFile(path.join(path.dirname(filename), jsonfile['edit']['output']))
  }
} else {
  // console.log("Mention a json file: node index.js -f example/edit.json")
  // process.exit(1)
}

var lastCommand

// init static server to serve generated files
var app = express()
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
var spacebroClient = new SpacebroClient()

console.log(`Connecting to spacebro on ${settings.service.spacebro.host}:${settings.service.spacebro.port}`)

spacebroClient.on('connect', () => {
  console.log(`spacebro: ${settings.service.spacebro.client.name} connected to ${settings.service.spacebro.host}:${settings.service.spacebro.port}#${settings.service.spacebro.channelName}`)
})

spacebroClient.on('newClient', (data) => {
  console.log(`spacebro: ${data.name} has joined.`)
})

spacebroClient.on('disconnect', () => {
  console.error('spacebro: connection lost.')
})

var sendMedia = function (data) {
  if (data.input && data.input.includes && data.input.includes(settings.folder.tmpDownload)) {
    fs.unlink(data.input, () => {})
  }
  delete data.input
  delete data.output
  delete data.outputTempPath
  spacebroClient.emit(settings.service.spacebro.client.out.outVideo.eventName, data)
  console.log(data)
}

var getDuration = path => {
  return new Promise(resolve => {
    ffmpeg.ffprobe(path, function (err, metadata) {
      if (err) {
        resolve(0)
      } else {
        resolve(metadata.format.duration)
      }
    })
  })
}

var downloadWithCache = async function (url) {
  let filename = filenamify(url)
  let filepath = path.join(settings.folder.tmpDownload, filename)
  if (!settings.cache) {
    console.log('downloading ' + url)
    await download(url, settings.folder.tmpDownload, {filename})
  } else {
    let exists = false
    try {
      await access(filepath)
      exists = true
    } catch (e) {
      exists = false
    }
    if (!exists) {
      console.log('downloading ' + url)
      await download(url, settings.folder.tmpDownload, {filename})
    } else {
      console.log('in cache: ' + url)
    }
  }
  return filepath
}

var downloadFile = async function (data) {
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

var downloadFilesInMeta = async function (data) {
  let values = data.meta
  for (let {parent, key, value} of deepIterator(values)) {
    if (key !== 'mjpgStream' && value && typeof value === 'string' && validUrl.isUri(value)) {
      let filepath = await downloadWithCache(value)
      parent[key] = filepath
    }
  }
  return data
}

var setFilenames = async function (data) {
  if (data.path && (typeof data.input !== 'string')) {
    data.input = data.path
  }
  if (data.input) {
    data.output = data.output || path.join(settings.folder.output, path.basename(data.input))
    data.output += '.mp4'
  } else {
    if (!data.output) {
      var date = moment()
      var timestampName = date.format('YYYY-MM-DDTHH-mm-ss-SSS') + '.mp4'
      data.output = path.join(settings.folder.output, path.basename(timestampName))
    }
  }
  data.output = await uniquefilename.get(data.output)
  data.outputTempPath = data.outputTempPath || path.join(settings.folder.tmp, path.basename(data.output))
  return data
}

var isImage = data => {
  if (data.filename) {
    if (data.filename.match(/png$/)) {
      return true
    }
  }
  return false
}

var onInputReceived = async data => {
  try {
    console.log(`Received event ${settings.service.spacebro.client.in.inMedia.eventName}, new media: ${JSON.stringify(data)}`)
    if (settings.minDuration) {
      let duration = await getDuration(data.path)
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
    let etnaInput = JSON.parse(JSON.stringify(data))
    // download
    delete data.input
    data = await downloadFile(data)
    for (var key in data.details) {
      await downloadFile(data.details[key])
    }
    data = await downloadFilesInMeta(data)
    // process
    data = await setFilenames(data)
    data.meta.etnaInput = etnaInput
    var recipe = data.recipe || settings.recipe
    var recipeFn = recipes.recipe(recipe)
    lastCommand = recipeFn(data, function () {
      // fs.rename(data.outputTempPath, data.output, function (err) {
      if (recipe !== 'addThumbnail') {
        exec('mv ' + data.outputTempPath + ' ' + data.output, function (err) {
          if (err) {
            console.log(err)
          } else {
            console.log('finished processing ' + data.output)
            data.type = 'video/' + path.extname(data.output).substring(1)
            data.path = data.output
            data.file = path.basename(data.output)
            data.url = `http://${settings.server.host}:${settings.server.port}/${path.basename(data.output)}`
            var meta = standardSettings.getMeta(data)
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
spacebroClient.on(settings.service.spacebro.client.in.inMedia.eventName, data => { onInputReceived(data) })

spacebroClient.on(settings.service.spacebro.client.in.stopLastProcess.eventName, function (data) {
  console.log('kill')
  if (lastCommand) {
    lastCommand.kill('SIGINT')
  }
})
