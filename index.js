var ffmpeg = require('fluent-ffmpeg')
var fs = require('fs')
var path = require('path')
// var config = require('./config.json')
var mkdirp = require('mkdirp')
var express = require('express')
var exec = require('child_process').exec
var moment = require('moment')
const spacebroClient = require('spacebro-client')
var standardSettings = require('standard-settings')
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
app.use(express['static'](settings.folder.output))
app.listen(process.env.PORT || settings.server.port)

console.log(`Serving on http://${settings.server.host}:${settings.server.port}`)

spacebroClient.connect(settings.service.spacebro.host, settings.service.spacebro.port, {
  clientName: settings.service.spacebro.clientName,
  channelName: settings.service.spacebro.channelName,
  /* packers: [{ handler: function handler (args) {
      return console.log(args.eventName, '=>', args.data)
  } }],
  unpackers: [{ handler: function handler (args) {
      return console.log(args.eventName, '<=', args.data)
  } }], */
  verbose: false,
  sendBack: false
})
console.log(`Connecting to spacebro on ${settings.service.spacebro.host}:${settings.service.spacebro.port}`)

spacebroClient.on('connect', () => {
  console.log(`spacebro: ${settings.service.spacebro.clientName} connected to ${settings.service.spacebro.host}:${settings.service.spacebro.port}#${settings.service.spacebro.channelName}`)
})

spacebroClient.on('new-member', (data) => {
  console.log(`spacebro: ${data.member} has joined.`)
})

spacebroClient.on('disconnect', () => {
  console.error('spacebro: connection lost.')
})

var sendMedia = function (data) {
  delete data.input
  delete data.output
  delete data.outputTempPath
  spacebroClient.emit(settings.service.spacebro.outputMessage, data)
  console.log(data)
}

// TODO: document 'new-media' data.recipe, data.input, data.output
// add data.options, like the path for an image to watermark, framerate, ...
spacebroClient.on(settings.service.spacebro.inputMessage, function (data) {
  console.log('Received new media: ' + JSON.stringify(data))
  if (data.path && data.input === undefined) {
    data.input = data.path
  }
  if (data.input) {
    data.output = data.output || path.join(settings.folder.output, path.basename(data.input))
    data.outputTempPath = data.outputTempPath || path.join(settings.folder.tmp, path.basename(data.output))
  } else {
    var date = moment()
    var timestampName = date.format('YYYY-MM-DDTHH-mm-ss-SSS') + '.mp4'
    data.output = data.output || path.join(settings.folder.output, path.basename(timestampName))
    data.outputTempPath = data.outputTempPath || path.join(settings.folder.tmp, path.basename(data.output))
  }

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
          if (data.meta === undefined) {
            data.meta = {}
          }
          data.meta.etnaInput = JSON.parse(JSON.stringify(data))
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
})

spacebroClient.on('etna-stop', function (data) {
  console.log('kill')
  if (lastCommand) {
    lastCommand.kill('SIGINT')
  }
})
