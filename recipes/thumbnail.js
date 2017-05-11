'use strict'
var ffmpeg = require('fluent-ffmpeg')
// var standardSettings = require('standard-settings')
var path = require('path')

module.exports = {
  thumbnail: function (data, callback) {
    var input = data.input
    var output = data.outputTempPath
    var name = path.basename(output, path.extname(path.basename(output)))
    var filename = name + '.png'
    data.outputTempPath = path.join(path.dirname(output), filename)
    ffmpeg(input)
      .thumbnail({
        timestamps: ['50%'],
        filename: filename,
        folder: path.dirname(output)
      })
      .on('start', function (commandLine) {
        console.log('Spawned Ffmpeg with command: ' + commandLine)
      })
      .on('error', function (err) {
        console.log('An error occurred while merging: ', err)
      })
      .on('progress', function (progress) {
        var date = Date()
        console.log(date.substr(16, date.length) + ' - Processing generation')
      })
      .on('end', function () {
        console.log('ffmpeg - finished to layer images')
        if (callback) return callback(null)
      })
  }
}
