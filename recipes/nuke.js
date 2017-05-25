'use strict'
var path = require('path')
var exec = require('child_process').exec
var mkdirp = require('mkdirp')
var cosmos = require('./cosmos')
var nconf = require('nconf')
var settings = nconf.get()

var nukeScript = function (data, callback) {
  var input = data.input
  var output = data.outputTempPath
  exec(settings.nuke.executable + ' -x ' + settings.nuke.script + ' ' + input + ' ' + output, function (error, stdout, stderr) {
    console.log('stdout: ' + stdout)
    console.error('stderr: ' + stderr)
    if (error !== null) {
      console.log('exec error: ' + error)
    }
    if (callback) return callback(null, data)
  })
}

module.exports = {
  albumSavedNuke: function (data, callback) {
    var folder = path.relative(path.dirname(data.src), data.src)
    data.input = path.join(data.src, folder + '-')
    data.output = path.join(settings.folder.output, folder)
    data.outputTempPath = path.join(settings.folder.tmp, folder)
    mkdirp(data.outputTempPath)
    nukeScript(data, function (error, data) {
      if (error) {
        console.log(error)
      } else {
        data.src = data.outputTempPath
        cosmos.albumSaved(data, callback)
      }
    })
  },
  photoNuke: function (data, callback) {
    var input = data.input
    var outputTempPath = data.outputTempPath
    var name = path.basename(data.input, path.extname(data.input))
    var folder = name
    data.outputTempPath = path.join(settings.folder.tmp, folder)
    mkdirp(data.outputTempPath)
    nukeScript(data, function (error, data) {
      if (error) {
        console.log(error)
      } else {
        data.src = data.outputTempPath
        cosmos.albumSaved(data, function() {
          var thumbnailDestPath = path.join(settings.folder.output, path.basename(input))
          var thumbnailStaticPath = 'http://' + settings.server.host + ':' + settings.server.port + '/' + path.basename(thumbnailDestPath)
          exec('cp ' + input + ' ' + thumbnailDestPath, function () {
            var details = {
              width: 0,
              height: 0,
              thumbnail: {
                file: path.basename(thumbnailDestPath),
                width: 0,
                height: 0,
                type: 'image/jpg',
                path: thumbnailDestPath,
                url: thumbnailStaticPath
              }
            }
            data.details = details
            callback()
          })
        })
      }
    })
  }
}
