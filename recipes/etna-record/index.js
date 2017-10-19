'use strict'
var ffmpeg = require('fluent-ffmpeg')
var standardSettings = require('standard-settings')
var settings = standardSettings.getSettings()
var path = require('path')
var replaceExt = require('replace-ext')
var thumbnail = require('./../thumbnail').thumbnail

var recordMpeg4 = function (data, callback) {
  var output = data.outputTempPath
  var meta = standardSettings.getMeta(data)
  var audioDevice = meta.audioDevice || 'hw:1'
  var mjpgStream = meta.mjpgStream
  var duration = meta.duration || 5
  var outputFps = meta.outputFps || 30
  var command = ffmpeg(audioDevice)
      .inputOptions(['-f alsa', '-ac 2'])
      .input(mjpgStream)
      .inputOptions(['-f mjpeg', '-r 30'])
      // .audioCodec('libmp3lame')
      // .videoCodec('libx264')
      .videoCodec('mpeg4')
      .outputOptions(['-pix_fmt yuv420p', '-b 100000000', '-t ' + duration])
      .fps(outputFps)
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

var record = function (data, callback) {
  var output = data.outputTempPath
  var meta = standardSettings.getMeta(data)
  var audioDevice = meta.audioDevice
  var mjpgStream = meta.mjpgStream
  var duration = meta.duration || 5
  var outputFps = meta.outputFps || 30
  var inputFps = meta.inputFps || 30
  var bitrate = meta.bitrate || '3500k'
  var videoCodec = meta.videoCodec || 'libx264'
  var thread_queue_size = meta.thread_queue_size || '100024'
  var command = ffmpeg()
  var audioOption = meta.audioOption
  if (audioDevice) {
    command
      .input(audioDevice)
      .inputOptions('-thread_queue_size ' + thread_queue_size)
      .inputOptions(['-f alsa', '-ac 2'])
  }
  if (audioOption) {
    command
      .inputOptions(audioOption)
  }
  if (meta.audioCodec) {
    command
      .audioCodec(meta.audioCodec)
  }
  if (meta.mjpgStream) {
    command
        .input(meta.mjpgStream)
        .inputOptions(['-f mjpeg', '-r ' + inputFps])
  } else {
    command
        .input(meta.webcam)
        .inputOptions(['-f v4l2', '-framerate ' + inputFps, '-video_size ' + meta.size, '-t ' + duration])
  }
  command
      .videoCodec(videoCodec)
      .outputOptions(['-pix_fmt yuv420p', '-b:v ' + bitrate])
      .fps(outputFps)
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

var recordWithThumbnail = function (data, callback) {
  return record(data, () => {
    data.input = data.outputTempPath
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
        url: 'http://' + settings.server.host + ':' + settings.server.port + '/' + path.basename(data.outputTempPath)
      }
      data.outputTempPath = outputTempPath
      if (callback) return callback(null)
    })
  })
}

module.exports = {
  record: record,
  recordWithThumbnail: recordWithThumbnail,
  recordMpeg4: recordMpeg4,
  record10000k: function (data, callback) {
    var output = data.outputTempPath
    data.outputTempPath = path.join(settings.folder.tmp, 'mpeg4-' + path.basename(data.output))
    var input = data.outputTempPath
    var meta = standardSettings.getMeta(data)
    var recCommand = recordMpeg4(data, function (err) {
      if (err) {
        console.log(err)
      }
      data.outputTempPath = output
      var command = ffmpeg(input)
      if (meta.format !== 'gif') {
        command
          .outputOptions(['-pix_fmt yuv420p'])
          .videoCodec('libx264')
      } else {
        output = replaceExt(output, '.gif')
        data.output = replaceExt(data.output, '.gif')
        data.outputTempPath = replaceExt(data.outputTempPath, '.gif')
      }
      if (meta.mirror) {
        command.complexFilter('hflip')
      }
      command
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
