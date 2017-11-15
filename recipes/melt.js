'use strict'
var path = require('path')
var fs = require('fs')
var spawn = require('child_process').exec
var standardSettings = require('standard-settings')
var settings = standardSettings.getSettings()

var createMeltScript = function (data, callback) {
  var meta = standardSettings.getMeta(data)
  fs.readFile(meta.melt.script, 'utf8', function (err, xml) {
    if (err) {
      if (callback) return callback(err, data)
    }
    xml = xml.replace(/input.mp4/g, path.resolve(data.input))
    .replace(/master.mp4/g, path.resolve(meta.melt.master))
    var name = path.basename(data.output, path.extname(path.basename(data.output)))
    var filename = name + '.mlt'
    var outputMeltFile = path.join(path.dirname(data.output), filename)

    fs.writeFile(outputMeltFile, xml, 'utf8', function (err) {
      meta.melt.script = outputMeltFile
      data.meta = meta
      if (callback) return callback(err, data)
    })
  })
}

var meltScript = function (data, callback) {
  createMeltScript(data, function (err, data) {
    if (err) {
      console.error(err)
      if (callback) return callback(err, data)
    }
    var output = data.outputTempPath
    var meta = standardSettings.getMeta(data)
    var command = settings.melt.executable + ' -progress -verbose ' + meta.melt.script + ' -consumer avformat:' + output + ' acodec=aac vcodec=libx264 crf=16'
    console.log('Spawn command: ' + command)
    var proc = spawn(command)
    /*
    proc.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`)
    })

    proc.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`)
    })
    */

    proc.on('close', (code) => {
      console.log(`child process exited with code ${code}`)
      if (callback) return callback(null, data)
    })
    proc.on('error', (err) => {
      console.log(`Failed to start subprocess: ${err}`)
    })
  })
}

module.exports = {
  melt: meltScript
}
