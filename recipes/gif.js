'use strict'
var path = require('path')
var ffmpeg = require('fluent-ffmpeg')
var standardSettings = require('standard-settings')
var fs = require('fs')
var _ = require('lodash')
const promisify = require('util').promisify
const writeFile = promisify(fs.writeFile)

var createConcatFile = async function (data, callback) {
  try {
    var details = Object.keys(data.details).sort()
    var listString = ''
    for (var i = 0; i < details.length; i++) {
      listString += 'file ' + data.details[details[i]].path + '\r\n'
    }
    // write
    var name = path.basename(data.output, path.extname(path.basename(data.output)))
    var filename = name + '.txt'
    var outputFile = path.join(path.dirname(data.output), filename)
    await writeFile(outputFile, listString, 'utf8')
    // return
    _.set(data, 'meta.gif.concatFile', outputFile)
    if (callback) return callback(null, data)
  } catch (err) {
    if (callback) return callback(err, data)
  }
}

var gif = function (data, callback) {
  createConcatFile(data, function (err, data) {
    if (err) {
      console.error(err)
      if (callback) return callback(err, data)
    }
    var output = data.outputTempPath
    var meta = standardSettings.getMeta(data)
    var gifMeta = meta.gif
    var bitrate = 6000
    var pixFmt = (meta.etna && meta.etna.pix_fmt) || 'yuv420p'
    var outputOptions = [
      '-movflags +faststart',
      '-threads 0',
      '-pix_fmt ' + pixFmt,
      '-maxrate ' + bitrate + 'k',
      '-bufsize ' + 2 * bitrate + 'k'
    ]
    var proc = ffmpeg()
    proc
      .videoCodec('libx264')
      .input(gifMeta.concatFile)
      .inputFps(gifMeta.fps)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(outputOptions)
      .fps(25)
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
  })
}

module.exports = {
  gif
}
