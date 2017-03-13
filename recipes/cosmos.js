'use strict'
var ffmpeg = require('fluent-ffmpeg')
var path = require('path')
var config = require('./../config.json')

var pingpong = function (data, callback) {
  var input = data.input
  var output = data.outputTempPath
  var watermark = 'assets/watermark.png'
  if (config.params) {
    watermark = config.params.watermark || watermark
  }
  if (data.params) {
    watermark = data.params.watermark || watermark
  }
  var bitrate = 6000
  var videoCodec = 'libx264'
  var outputOptions = [
    '-movflags +faststart',
    '-threads 0',
    '-pix_fmt yuv420p',
      // '-gifflags -transdiff -y',
      // '-vcodec ' + bitrate + 'k',
    '-maxrate ' + bitrate + 'k',
    '-bufsize ' + 2 * bitrate + 'k'
  ]
  var command = ffmpeg()
      .addInput(path.join(input, '%*.jpg'))
      // .addInput("assets/watermark.png")
      .addInput(watermark)

  command
      // .complexFilter(['overlay=shortest=1'])
      .inputFPS(config.pingpong.inputFramerate)
      .fps(25)
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

  if (config.pingpong.loops > 0) {
      // ffmpeg -i out.mp4 -filter_complex "[0]reverse[r];[0][r]concat,loop=5:250,setpts=N/25/TB" output.mp4
    console.log('use pingpong loops')
    command.complexFilter([
      '[0]reverse[r];[0][r]concat,loop=' + config.pingpong.loops + ':250,setpts=N/' + config.pingpong.inputFramerate + '/TB,scale=640:640[pingpong]',
      '[pingpong]crop=in_h:in_h:(in_w-in_h)/2:0[c]',
      '[c][1] overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2+100'
        // '[pingpong]crop=in_h:in_h:(in_w-in_h)/2:0,scale=640:640',
        // '[pingpong]scale=iw/2:ih/2',
    ])
  }
  if (config.pingpong.gif !== true) {
    command
        .videoCodec(videoCodec)
        .outputOptions(outputOptions)
  }

  command.save(output)
}

var pingpongRaw = function (data, callback) {
  var input = data.input
  var output = data.outputTempPath
  var bitrate = 6000
  var videoCodec = 'libx264'
  var outputOptions = [
    '-movflags +faststart',
    '-threads 0',
    '-pix_fmt yuv420p',
      // '-gifflags -transdiff -y',
      // '-vcodec ' + bitrate + 'k',
    '-maxrate ' + bitrate + 'k',
    '-bufsize ' + 2 * bitrate + 'k'
  ]
  var command = ffmpeg()
      .addInput(path.join(input, '%*.png'))
      .addInput('assets/watermark.png')

  command
      // .complexFilter(['overlay=shortest=1'])
      .inputFPS(config.pingpong.inputFramerate)
      .fps(25)
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

  if (config.pingpong.loops > 0) {
      // ffmpeg -i out.mp4 -filter_complex "[0]reverse[r];[0][r]concat,loop=5:250,setpts=N/25/TB" output.mp4
    console.log('use pingpong loops')
    command.complexFilter([
      '[0]reverse[r];[0][r]concat,loop=' + config.pingpong.loops + ':250,setpts=N/' + config.pingpong.inputFramerate + '/TB[pingpong]',
        // '[pingpong]crop=in_h:in_h:(in_w-in_h)/2:0[c]',
        // '[c][1] overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2,scale=640:640'
      '[pingpong]crop=in_h:in_h:(in_w-in_h)/2:0,scale=640:640'
    ])
  }
  if (config.pingpong.gif !== true) {
    command
        .videoCodec(videoCodec)
        .outputOptions(outputOptions)
  }

  command.save(output)
}

module.exports = {
  albumSaved: function (data, callback) {
    data.input = data.src
    var filename = path.relative(path.dirname(data.src), data.src) + '.mp4'
    data.output = path.join(config.output.folder, filename)
    data.outputTempPath = path.join(config.output.temp, filename)

    if (data.raw) {
      pingpongRaw(data, callback)
    } else {
      pingpong(data, callback)
    }
  },
  pingpong: pingpong,
  pingpongRaw: pingpongRaw
}
