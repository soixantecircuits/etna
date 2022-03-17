'use strict'
var path = require('path')
var fs = require('fs')
var spawn = require('child_process').exec
var standardSettings = require('standard-settings')
var settings = standardSettings.getSettings()
const promisify = require('util').promisify

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

var createMeltScript = async function (data, callback) {
  var meta = standardSettings.getMeta(data)
  try {
    // read
    var xml
    if (meta.melt.scriptString) {
      xml = meta.melt.scriptString
    } else {
      try {
        xml = await readFile(meta.melt.script, 'utf8')
      } catch (err) {
        console.error('Error reading file ' + meta.melt.script)
        throw err
      }
    }
    // replace
    if (data.input) {
      xml = xml.replace(/input\.(mp4|jpg)/g, path.resolve(data.input))
    }
    xml = xml.replace(/master.mp4/g, path.resolve(meta.melt.master))
    if (data.details) {
      for (let i = 0; i < Object.keys(data.details).length; i++) {
        const key = Object.keys(data.details)[i]
        const name = 'details.' + key
        const regex = new RegExp(name + '\.(mp4|jpg)', 'g')
        xml = xml.replace(regex, path.resolve(data.details[key].path))
      }
    }

    // write
    var name = path.basename(data.output, path.extname(path.basename(data.output)))
    var filename = name + '.mlt'
    var outputMeltFile = path.join(path.dirname(data.output), filename)
    await writeFile(outputMeltFile, xml, 'utf8')
    // return
    meta.melt.script = outputMeltFile
    meta.melt.scriptString = xml
    data.meta = JSON.parse(JSON.stringify(meta))
    if (callback) return callback(null, data)
  } catch (err) {
    if (callback) return callback(err, data)
  }
}

var meltScript = function (data, callback) {
  createMeltScript(data, function (err, data) {
    if (err) {
      console.error(err)
      if (callback) return callback(err, data)
    }
    var output = data.outputTempPath
    var meta = standardSettings.getMeta(data)
    var flags = '-silent'
    if (settings.melt.verbose) {
      flags = '-progress -verbose'
    }
    var command = settings.melt.executable + ' ' + flags + ' ' + meta.melt.script + ' -consumer avformat:' + output + ' acodec=aac vcodec=libx264 crf=16'
    console.log('Spawn command: ' + command)
    var proc = spawn(command)

    /* stdout containes boring stuff
    proc.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`)
    })
    */

    proc.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`)
    })

    proc.on('close', (code) => {
      console.log(`melt process exited with code ${code}`)
      if (callback) return callback(null, data)
    })
    proc.on('error', (err) => {
      console.log(`Failed to start melt: ${err}`)
    })
  })
}

module.exports = {
  melt: meltScript
}
