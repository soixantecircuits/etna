'use strict'
var ffmpeg = require('fluent-ffmpeg')

module.exports = {
  watermark: function (data, callback) {
    var input = data.input
    var output = data.outputTempPath
    var watermark = 'assets/watermark.png'
    if (data.params) {
      watermark = data.params.watermark || watermark
    }
    ffmpeg(input)
      .input(watermark)
      .audioCodec('libmp3lame')
      .videoCodec('libx264')
      .fps(25)
      .complexFilter([
        {
          filter: 'overlay',
          options: 'format=rgb',
          inputs: ['0:0', '1:0'],
          outputs: 'output'
        }], 'output')
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
    data.params = data.params || '1024:576:0:0'
    ffmpeg(input)
      .audioCodec('libmp3lame')
      .videoCodec('libx264')
      .fps(25)
      .videoFilters('crop=' + data.params)
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
    var watermark = data.watermak || 'example/gabarit_1024.mov'
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
    var watermark = data.watermark || 'example/gabarit_1024.mov'
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
