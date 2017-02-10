var ffmpeg = require('fluent-ffmpeg')
var fs = require('fs')
var path = require('path')
var exec = require('child_process').exec
var utils = require('./utils')
var config = require('./config.json')
var io = require('socket.io-client')
var mkdirp = require('mkdirp')
var express = require('express')
var ip = require('ip')
const spaceBro = require('spacebro-client')

var crop = require('./recipes/crop-and-overlay')
var cosmos = require('./recipes/cosmos')

mkdirp(config.output.folder)
mkdirp(config.output.temp)

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
config.staticServer = config.staticServer || {}
config.staticServer.host = config.staticServer.host || 'localhost'
config.staticServer.port = config.staticServer.port || 8866
app = express()
app.use(express['static'](config.output.folder))
app.listen(process.env.PORT || config.staticServer.port, config.staticServer.host)
console.log('Serving on http://' + config.staticServer.host + ':' + config.staticServer.port)

// connect to spacebro to receive media to process
config.spacebro = config.spacebro || {}
config.spacebro.host = config.spacebro.host || 'spacebro.space'
config.spacebro.port = config.spacebro.port || 3333
config.spacebro.clientName = config.spacebro.clientName || 'etna'
config.spacebro.channelName = config.spacebro.channelName || 'etna'

spaceBro.connect(config.spacebro.host, config.spacebro.port, {
  clientName: config.spacebro.clientName,
  channelName: config.spacebro.channelName,
  /*packers: [{ handler: function handler (args) {
      return console.log(args.eventName, '=>', args.data)
  } }],
  unpackers: [{ handler: function handler (args) {
      return console.log(args.eventName, '<=', args.data)
  } }],*/
  verbose: false,
  sendBack: false
})

config.spacebro.inputMessage = config.spacebro.inputMessage || 'new-media-for-etna'
config.spacebro.outputMessage = config.spacebro.outputMessage || 'new-media-from-etna'
// 'new-media' data.recipe, data.input, data.output
spaceBro.on (config.spacebro.inputMessage, function (data) {
  if (data.input) {
    data.output = data.output || path.join(config.output.folder, path.basename(data.input))
    data.outputTempPath =  data.outputTempPath || path.join(config.output.temp, path.basename(data.output))
  }
  data.recipe = data.recipe || config.recipe
  //var recipe = crop[data.recipe] || cosmos[data.recipe]
  //recipe(data, function () {
  cosmos[data.recipe](data, function () {
    exec('mv ' + data.outputTempPath + ' ' + data.output)
    console.log('finished video ' + data.output)
    data.src = 'http://' + config.staticServer.host + ':' + config.staticServer.port + '/' + path.basename(data.output)
    spaceBro.emit(config.spacebro.outputMessage, data)
  })

})

setTimeout(function(){
  //spaceBro.emit('album-saved', {src:'/tmp/.temp/g6risryj7ef' } )
  spaceBro.emit('album-saved', {src:'/home/emmanuel/Videos/1qar15risvj4r3p', raw: false } )
  console.log('emit ')
}, 300)

/*
var data = {src:'/opt/share/tmp/.temp/1qar1wfit4786on'}
var filename = path.relative(path.dirname(data.src), data.src) + '.mp4'
var outputPath =  path.join(config.output.folder,filename)
var outputTempPath =  path.join(config.output.temp, filename)
png2prores(data.src, outputTempPath, function () {
    exec('mv ' + outputTempPath + ' ' + outputPath)
    console.log('finished video')
})
*/
