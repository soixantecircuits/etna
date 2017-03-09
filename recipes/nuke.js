'use strict'
var path = require('path')
var config = require('./../config.json')
var exec = require('child_process').exec
var mkdirp = require('mkdirp')
var cosmos = require('./cosmos')

var nukeScript = function (data, callback) {
  var input = data.input
  var output = data.outputTempPath
  exec(config.nuke.executable + ' -x ' + config.nuke.script + ' ' + input + ' ' + output, function (error, stdout, stderr) {
    console.log('stdout: ' + stdout)
    console.error('stderr: ' + stderr)
    if (error !== null) {
      console.log('exec error: ' + error)
    }
    if (callback) return callback(null, data)
  })
}

module.exports = {
  albumSavedNuke: function (data, callback) {
    var folder = path.relative(path.dirname(data.src), data.src)
    data.input = path.join(data.src, folder + '-')
    data.output = path.join(config.output.folder, folder)
    data.outputTempPath = path.join(config.output.temp, folder)
    mkdirp(data.outputTempPath)
    nukeScript(data, function (error, data) {
      if (error) {
        console.log(error)
      } else {
        data.src = data.outputTempPath
        cosmos.albumSaved(data, callback)
      }
    })
  }
}
