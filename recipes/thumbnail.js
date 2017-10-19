'use strict'
var ffmpeg = require('fluent-ffmpeg')
var path = require('path')
var standardSettings = require('standard-settings')
var settings = standardSettings.getSettings()

var thumbnail = function (data, callback) {
  var meta = standardSettings.getMeta(data)
  var input = data.input
  var output = data.outputTempPath
  var name = path.basename(output, path.extname(path.basename(output)))
  var filename = name + '.png'
  data.outputTempPath = path.join(path.dirname(output), filename)
  data.output = path.join(path.dirname(data.output), filename)
  if (typeof meta.thumbnail !== 'object' || meta.thumbnail.position === undefined) {
    meta.thumbnail = meta.thumbnail || {}
    meta.thumbnail.position = '50%'
  }
  ffmpeg(input)
    .thumbnail({
      timestamps: [meta.thumbnail.position],
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

var addThumbnail = function (data, callback) {
  var input = data.input
  var output = data.output
  var outputTempPath = data.outputTempPath
  var name = path.basename(outputTempPath, path.extname(path.basename(outputTempPath)))
  var filename = name + '.png'
  data.outputTempPath = path.join(settings.folder.output, filename)
  thumbnail(data, () => {
    if (data.details === undefined) {
      data.details = {}
    }
    data.details.thumbnail = {
      path: data.outputTempPath,
      file: filename,
      url: 'http://' + settings.server.host + ':' + settings.server.port + '/' + path.basename(data.outputTempPath)
    }
    data.outputTempPath = input
    data.output = output
    if (callback) return callback(null)
  })
}

module.exports = {
  thumbnail: thumbnail,
  addThumbnail: addThumbnail
}
