'use strict'
var ffmpeg = require('fluent-ffmpeg')
var standardSettings = require('standard-settings')
var mediaHelper = require('media-helper')
var replaceExt = require('replace-ext')

var changeExtension = function (data, ext) {
  data.output = replaceExt(data.output, ext)
  data.outputTempPath = replaceExt(data.outputTempPath, ext)
  data.path = data.output
  data.file = replaceExt(data.file, ext)
  data.filename = replaceExt(data.filename, ext)
  data.type = 'video/' + ext.substring(1)
}

module.exports = {
  watermark: function (data, callback) {
    var meta = standardSettings.getMeta(data)
    var watermark = meta.watermark
    if (typeof watermark !== 'object') {
      watermark = { path: watermark }
    }
    if (watermark.path === undefined) {
      data.outputTempPath = data.input
      if (callback) return callback(null)
      return
    }
    var input = data.input
    var output = data.outputTempPath
    var complexFilter = []
    var inputOption = ''
    var watermarkInputOption = ''
    var x = 0
    var y = 0
    var withAudio = true
    var crop = meta.output
    var speed = meta.speed
    var isInputImage = false

    mediaHelper.isImage(data.input)
      .then((isImage) => {
        if (isImage) {
          // dummyThumbnail(data)
          isInputImage = true
          inputOption = '-loop 1'
          output = replaceExt(output, '.mp4')
          data.output = replaceExt(data.output, '.mp4')
          data.outputTempPath = replaceExt(data.outputTempPath, '.mp4')
        }
        return mediaHelper.isImage(watermark.path)
      })
      .then((isImage) => {
        if (isImage) {
          // watermarkInputOption = '-loop 1' // not needed in latest ffmpeg
        }
        isImage = true
        // withAudio = !(watermark.keepAudio === false)
        withAudio = watermark.keepAudio
        if (watermark.end) {
          var start = watermark.start || 0
          var end = watermark.end || start + 2
          var fadeDuration = watermark.fadeDuration || 0.2
          start = Math.max(start, 0)
          end = Math.max(end, 0)

          x = watermark.x || 0
          y = watermark.y || 0
          x = Math.max(Math.round(x), 0)
          y = Math.max(Math.round(y), 0)
          var overlayOptions = [x + ':' + y, 'format=rgb']
          if (isImage || isInputImage) {
            overlayOptions.push('shortest=1')
          }
          var watermarkInput = '1:0'
          let videoInput = '0:v'
          if (watermark.width) {
            var width = watermark.width || 100
            var height = watermark.height || 100
            width = Math.max(Math.round(width), 0)
            height = Math.max(Math.round(height), 0)
            complexFilter.push({
              filter: 'scale',
              options: width + 'x' + height,
              inputs: watermarkInput,
              outputs: 'scaled'
            })
            watermarkInput = 'scaled'
          }
          if (meta.transform) {
            if (meta.transform.transpose) {
              complexFilter.push({
                filter: 'transpose',
                options: meta.transform.transpose,
                inputs: videoInput,
                outputs: 'transposed'
              })
              videoInput = 'transposed'
            }
            if (meta.transform.width && meta.transform.height) {
              complexFilter.push({
                filter: 'scale',
                options: meta.transform.width + 'x' + meta.transform.height,
                inputs: videoInput,
                outputs: 'inputscaled'
              })
              videoInput = 'inputscaled'
            }
            if (meta.transform.pad) {
              complexFilter.push({
                filter: 'pad',
                options: meta.transform.pad.width + ':' + meta.transform.pad.height + ':' + meta.transform.pad.x + ':' + meta.transform.pad.y + ':' + (meta.transform.pad.color || 'white'),
                inputs: videoInput,
                outputs: 'inputpadded'
              })
              videoInput = 'inputpadded'
            }
          }

          complexFilter.push({
            // filter: 'format=pix_fmts=yuva420p,fade',
            // options: 'in:st=' + start + ':d=' + fadeDuration + ':alpha=1,fade=out:st=' + end + ':d=' + fadeDuration + ':alpha=1',
            filter: 'fade',
            options: 'in:st=' + start + ':d=' + fadeDuration + ':alpha=1,fade=out:st=' + end + ':d=' + fadeDuration + ':alpha=1',
            inputs: watermarkInput,
            outputs: 'watermark'
          },
          {
            filter: 'overlay',
            options: overlayOptions,
            inputs: [videoInput, 'watermark'],
            outputs: 'output'
          })
        } else {
          let videoInput = '0:v'
          if (speed) {
            const options = 1 / speed + '*PTS'
            complexFilter.push({
              filter: 'setpts',
              options: [options],
              inputs: [videoInput],
              outputs: 'speeded'
            })
            videoInput = 'speeded'
          }
          if (crop) {
            const options = crop.width + ':' + crop.height + ':' + '(in_w-' + crop.width + ')/2:(in_h-' + crop.height + ')/2'
            complexFilter.push({
              filter: 'crop',
              options: [options],
              inputs: [videoInput],
              outputs: 'cropped'
            })
            videoInput = 'cropped'
          }

          complexFilter.push({
            filter: 'scale2ref',
            inputs: ['1:0', videoInput],
            outputs: '[scaled][ref]'
          })

          complexFilter.push({
            filter: 'overlay',
            options: ['format=rgb'],
            inputs: ['ref', 'scaled'],
            outputs: 'output'
          })
        }

        var proc = ffmpeg(input)
        if (meta.audioCodec) {
          proc
            .audioCodec(meta.audioCodec)
        }
        if (inputOption) {
          proc.inputOptions(inputOption)
        }
        proc
          .input(watermark.path)
        if (watermarkInputOption) {
          proc.inputOptions(watermarkInputOption)
        }
        proc
          .videoCodec('libx264')
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
      })
      .catch((err) => {
        console.log(err)
      })
  },
  convert: function (data, callback) {
    changeExtension(data, '.mp4')
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
    var meta = standardSettings.getMeta(data)
    var watermark = meta.watermark
    const proc = ffmpeg(input)

    if (watermark) {
      proc.input(watermark)
        .complexFilter([
        // [1:0][0:0]scale2ref[scaled][ref];[ref][scaled]overlay=format=rgb[output]
          {
            filter: 'scale2ref',
            inputs: ['1:0', '0:0'],
            outputs: '[scaled][ref]'
          },
          {
            filter: 'overlay',
            options: 'format=rgb',
            inputs: ['ref', 'scaled'],
            outputs: 'output'
          }
        ], 'output')
      // .inputOption('-loop 1')
    }
    proc
      // .audioCodec('libmp3lame')
      .videoCodec(videoCodec)
      .outputOptions(outputOptions)
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
