'use strict'
var ffmpeg = require('fluent-ffmpeg')
/*
var mediaHelper = require('media-helper')
var replaceExt = require('replace-ext')
var exec = require('child_process').exec
var path = require('path')
*/
var standardSettings = require('standard-settings')
// var settings = standardSettings.getSettings()

var mixAudio = function (data, callback) {
  var input = data.input
  var output = data.outputTempPath
  var meta = standardSettings.getMeta(data)
  var complexFilter = []
  complexFilter.push({
    filter: 'amix',
    options: ['2'],
    inputs: ['0', '1']
  })
  ffmpeg(input)
      .input(meta.audio)
      .videoCodec('copy')
      .complexFilter(complexFilter)
      .on('end', function () {
        console.log('files have been mixed succesfully')
        if (callback) return callback(null)
      })
      .on('error', function (err, stdout, stderr) {
        console.log('an error happened: ' + err.message, stdout, stderr)
      })
      .on('start', function (commandLine) {
        console.log('Spawned Ffmpeg with command: ' + commandLine)
      })
      .output(output)
      .run()
}

module.exports = {
  mixAudio: mixAudio
}
