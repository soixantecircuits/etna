'use strict'
var ffmpeg = require('fluent-ffmpeg')
var standardSettings = require('standard-settings')
// var nconf = require('nconf')
// var settings = nconf.get()
// var path = require('path')

module.exports = {
  record: function (data, callback) {
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
}
