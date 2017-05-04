'use strict'
var ffmpeg = require('fluent-ffmpeg')
var standardSettings = require('standard-settings')
var nconf = require('nconf')
var settings = nconf.get()
var path = require('path')
var recordMpeg4 = function (data, callback) {
  var output = data.outputTempPath
  var meta = standardSettings.getMeta(data)
  var audioDevice = meta.audioDevice || 'hw:1'
  var mjpgStream = meta.mjpgStream
  var duration = meta.duration || 5
  var command = ffmpeg(audioDevice)
      .inputOptions(['-f alsa', '-ac 2'])
      .input(mjpgStream)
      .inputOptions(['-f mjpeg', '-r 30'])
      // .audioCodec('libmp3lame')
      // .videoCodec('libx264')
      .videoCodec('mpeg4')
      .outputOptions(['-pix_fmt yuv420p', '-b 100000000', '-t ' + duration])
      .fps(30)
      .on('end', function () {
        console.log('file have been recorded succesfully')
        if (callback) return callback(null)
      })
      .on('error', function (err, stdout, stderr) {
        console.log('an error happened: ' + err.message, stdout, stderr)
        if (callback) return callback(null)
      })
      .on('start', function (commandLine) {
        console.log('Spawned Ffmpeg with command: ' + commandLine)
      })
      .output(output)
  command.run()
  return command
}

module.exports = {
  record: function (data, callback) {
    var output = data.outputTempPath
    data.outputTempPath = path.join(settings.folder.tmp, 'mpeg4-' + path.basename(data.output))
    var input = data.outputTempPath
    var recCommand = recordMpeg4(data, function (err) {
      if (err) {
        console.log(err)
      }
      data.outputTempPath = output
      var command = ffmpeg(input)
        .outputOptions(['-pix_fmt yuv420p'])
        .videoCodec('libx264')
        .on('end', function () {
          console.log('file have been post-processed succesfully')
          if (callback) return callback(null)
        })
        .on('error', function (err, stdout, stderr) {
          console.log('an error happened: ' + err.message, stdout, stderr)
          if (callback) return callback(null)
        })
        .on('start', function (commandLine) {
          console.log('Spawned Ffmpeg with command: ' + commandLine)
        })
        .output(output)
      command.run()
    })
    return recCommand
  }
}
