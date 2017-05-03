var ffmpeg = require('fluent-ffmpeg')
var fs = require('fs')
var path = require('path')
// var config = require('./config.json')
var mkdirp = require('mkdirp')
var express = require('express')
var exec = require('child_process').exec
const spaceBro = require('spacebro-client')
require('standard-settings')
var nconf = require('nconf')

var recipes = require('./recipes')

var settings = nconf.get()
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

// init static server to serve generated files
settings.server = settings.server || {}
settings.server.host = settings.server.host || 'localhost'
settings.server.port = settings.server.port || 8866
var app = express()
app.use(express['static'](settings.folder.output))
app.listen(process.env.PORT || settings.server.port, settings.server.host)
console.log('Serving on http://' + settings.server.host + ':' + settings.server.port)

// connect to spacebro to receive media to process
settings.service.spacebro = settings.service.spacebro || {}
settings.service.spacebro.host = settings.service.spacebro.host || 'spacebro.space'
settings.service.spacebro.port = settings.service.spacebro.port || 3333
settings.service.spacebro.clientName = settings.service.spacebro.clientName || 'etna'
settings.service.spacebro.channelName = settings.service.spacebro.channelName || 'etna'

spaceBro.connect(settings.service.spacebro.host, settings.service.spacebro.port, {
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
console.log('Connecting to spacebro on ' + settings.service.spacebro.host + ':' + settings.service.spacebro.port)

settings.service.spacebro.inputMessage = settings.service.spacebro.inputMessage || 'new-media-for-etna'
settings.service.spacebro.outputMessage = settings.service.spacebro.outputMessage || 'new-media-from-etna'
// TODO: document 'new-media' data.recipe, data.input, data.output
// add data.options, like the path for an image to watermark, framerate, ...
spaceBro.on(settings.service.spacebro.inputMessage, function (data) {
  console.log('Received new media: ' + JSON.stringify(data))
  if (data.path && data.input === undefined) {
    data.input = data.path
  }
  if (data.input) {
    data.output = data.output || path.join(settings.folder.output, path.basename(data.input))
    data.outputTempPath = data.outputTempPath || path.join(settings.folder.tmp, path.basename(data.output))
  }
  data.recipe = data.recipe || settings.recipe
  var recipeFn = recipes.recipe(data.recipe)
  recipeFn(data, function () {
    // fs.rename(data.outputTempPath, data.output, function (err) {
    exec('mv ' + data.outputTempPath + ' ' + data.output, function (err) {
      if (err) {
        console.log(err)
      } else {
        console.log('finished video ' + data.output)
        if (!data.details) {
          data.details = {}
        }
        data.details.etnaInput = data
        data.path = data.output
        data.url = 'http://' + settings.server.host + ':' + settings.server.port + '/' + path.basename(data.output)
        spaceBro.emit(settings.service.spacebro.outputMessage, data)
      }
    })
  })
})
