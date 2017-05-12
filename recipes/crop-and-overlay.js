'use strict'
var ffmpeg = require('fluent-ffmpeg')
var standardSettings = require('standard-settings')

module.exports = {
  watermark: function (data, callback) {
    var watermark = standardSettings.getMeta(data).watermark
    if (watermark === undefined || watermark.path === undefined) {
      data.outputTempPath = data.input
      if (callback) return callback(null)
      return
    }
    var input = data.input
    var output = data.outputTempPath
    var complexFilter = []
    var inputOption
    var x = 0
    var y = 0
    var withAudio = true
    if (typeof watermark === 'object') {
      var start = watermark.start || 0
      var end = watermark.end || start + 2
      var fadeDuration = watermark.fadeDuration || 0.2
      start = Math.max(start, 0)
      end = Math.max(end, 0)
      withAudio = watermark.keepAudio

      x = watermark.x || 0
      y = watermark.y || 0
      x = Math.max(Math.round(x), 0)
      y = Math.max(Math.round(y), 0)
      inputOption = '-loop 1'
      var inputVideo = '1:0'
      if (watermark.width) {
        var width = watermark.width || 100
        var height = watermark.height || 100
        width = Math.max(Math.round(width), 0)
        height = Math.max(Math.round(height), 0)
        complexFilter.push({
          filter: 'scale',
          options: width + 'x' + height,
          inputs: inputVideo,
          outputs: 'scaled'
        })
        inputVideo = 'scaled'
      }
      watermark = watermark.path

      complexFilter.push({
        filter: 'fade',
        options: 'in:st=' + start + ':d=' + fadeDuration + ',fade=out:st=' + end + ':d=' + fadeDuration,
        inputs: inputVideo,
        outputs: 'watermark'
      },
        {
          filter: 'overlay',
          options: [x + ':' + y, 'format=rgb', 'shortest=1'],
          inputs: ['0:v', 'watermark'],
          outputs: 'output'
        })
    } else {
      complexFilter.push({
        filter: 'overlay',
        options: ['format=rgb'],
        inputs: ['0:v', '1:0'],
        outputs: 'output'
      })
    }
    var proc = ffmpeg(input)
    if (inputOption) {
      proc.input(watermark).inputOptions(inputOption)
    } else {
      proc.input(watermark)
    }
    proc
      .videoCodec('libx264')
      .fps(25)
      .complexFilter(complexFilter, 'output')
      .outputOptions(['-pix_fmt yuv420p'])
    if (withAudio) {
      proc
        .outputOptions(['-map 0:a'])
    }
    proc
      .on('end', function () {
        console.log('files have been watermarked succesfully')
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
  },
  crop: function (data, callback) {
    var input = data.input
    var output = data.outputTempPath
    // ffmpeg -i steve.mp4 -filter:v "crop=1024:576:0:0" steve_1024.mp4
    // var roi = '1024:576:0:0'
    var roi = standardSettings.getMeta(data).roi
    ffmpeg(input)
      .audioCodec('libmp3lame')
      .videoCodec('libx264')
      .fps(25)
      .videoFilters('crop=' + roi)
      .on('end', function () {
        console.log('files have been cropped succesfully')
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
  },
  crop_and_add_soundtrack: function (data, callback) {
    var input = [data.input, data.audio]
    var output = data.outputTempPath
    // ffmpeg -i steve.mp4 -filter:v "crop=1024:576:0:0" steve_1024.mp4
    ffmpeg.ffprobe(input[0], function (err, videodata) {
      if (err) {
        console.err(err)
      } else {
        var duration = videodata.format.duration
        data.audioOffset = data.audioOffset || 0
        var ss = data.audioOffset - duration
        data.cropParams = data.cropParams || '1024:576:0:0'
        ffmpeg(input[0])
          .input(input[1])
          .inputOptions('-ss ' + ss)
          .outputOptions('-map 0:v')
          .outputOptions('-map 1:a')
          .outputOptions('-shortest')
          .outputOptions('-strict -2')
          // .audioCodec('libmp3lame')
          .videoCodec('libx264')
          .fps(25)
          .videoFilters('crop=' + data.cropParams)
          .on('end', function () {
            console.log('files have been cropped succesfully')
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
    })
  },
  overlay: function (data, callback) {
    var input = data.input
    var output = data.outputTempPath
    var watermark = standardSettings.getMeta(data).watermark
    ffmpeg(input)
      .input(watermark)
      .inputOptions('-vcodec qtrle')
      .audioCodec('libmp3lame')
      .videoCodec('libx264')
      .complexFilter([

        /*
        // Duplicate rescaled stream 3 times into streams a, b, and c
        {
          filter: 'fade', options: 'out:25:24:alpha=1',
          inputs: '1:0', outputs: 'wm'
        }, */

        // Create stream 'red' by removing green and blue channels from stream 'a'
        {
          filter: 'overlay',
          options: 'format=rgb',
          // inputs: ['0:0', 'wm'], outputs: 'output'
          inputs: ['0:0', '1:0'],
          outputs: 'output'
        }], 'output')
      .on('end', function () {
        console.log('files have been overlayed succesfully')
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
  },
  overlay2: function (data, callback) {
    var input = data.input
    var output = data.outputTempPath
    var watermark = standardSettings.getMeta(data).watermark
    /*
    var timecodes = [
      [3, 3.5],
      [4.5, 9],
      [11, 13],
    ]
    */
    var timecodes = [
      [5.3, 5.6],
      [5.9, 6.2],
      [7, 10],
      [12, 13]
    ]
    var fadeDuration = 0.2

    var complexFilter = []
    timecodes.forEach(function (element, i) {
      var input0, input1, output0
      if (i === 0) {
        input0 = '0:0'
        input1 = 'mix' + i
        output0 = 'mix' + (i + 1)
      } else {
        input0 = 'mix' + (i * 2 - 1)
        input1 = 'mix' + (i * 2)
        output0 = 'mix' + (i * 2 + 1)
      }

      // st= time wher the fadein starts
      // d= duration of the fadein
      complexFilter.push({
        filter: 'format=pix_fmts=yuva420p,fade',
        options: 'in:st=' + element[0] + ':d=' + fadeDuration + ':alpha=1,fade=out:st=' + element[1] + ':d=' + fadeDuration + ':alpha=1',
        inputs: '1:0',
        outputs: input1
      },
        {
          filter: 'overlay',
          options: 'format=rgb',
          inputs: [input0, input1],
          outputs: output0
        })
    })
    complexFilter.push({
      filter: 'overlay',
      options: 'format=rgb,trim=duration=16.8', // edited from 15
      inputs: ['mix' + ((timecodes.length - 1) * 2 + 1), '2:0'],
      outputs: 'output'
    })

    ffmpeg(input[0])
      .input(input[1])
      .input(watermark)
      .inputOptions('-vcodec qtrle')
      .audioCodec('libmp3lame')
      .videoCodec('libx264')
      .fps(25)
      .complexFilter(complexFilter, 'output')
      .outputOptions('-pix_fmt yuv420p')
      .on('end', function () {
        console.log('files have been overlayed succesfully')
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

}
