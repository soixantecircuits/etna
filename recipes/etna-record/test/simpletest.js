'use strict'
const spaceBro = require('spacebro-client')
var nconf = require('nconf')
require('standard-settings')
var settings = nconf.get()

settings.service.spacebro = settings.service.spacebro || {}
settings.service.spacebro.host = settings.service.spacebro.host || 'spacebro.space'
settings.service.spacebro.port = settings.service.spacebro.port || 3333
settings.service.spacebro.clientName = settings.service.spacebro.clientName || 'etna'
settings.service.spacebro.channelName = settings.service.spacebro.channelName || 'etna'

spaceBro.connect(settings.service.spacebro.host, settings.service.spacebro.port, {
  clientName: settings.service.spacebro.clientName,
  channelName: settings.service.spacebro.channelName,
  verbose: false,
  sendBack: false
})
console.log('Connecting to spacebro on ' + settings.service.spacebro.host + ':' + settings.service.spacebro.port)

settings.service.spacebro.inputMessage = settings.service.spacebro.inputMessage || 'new-media-for-etna'
settings.service.spacebro.outputMessage = settings.service.spacebro.outputMessage || 'new-media-from-etna'
spaceBro.on(settings.service.spacebro.outputMessage, function (data) {
  console.log('video is ready: ' + data.output)
})

setTimeout(function () {
  spaceBro.emit(settings.service.spacebro.inputMessage, {
    recipe: 'record',
    // path: 'record.mp4', // optional, if not defined it will be a timestamp
    meta: {
      mjpgStream: 'http://localhost:8880/?action=stream',
      duration: 1,
      mirror: true,
      audioDevice: 'default'
    }
  })
  console.log('emit ')
}, 300)

setTimeout(function () {
  spaceBro.emit('etna-stop', {
    option: 'option'
  })
}, 8000)
