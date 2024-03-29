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
  client: {
    name: settings.service.spacebro.clientName + '-test'
  },
  channelName: settings.service.spacebro.channelName,
  verbose: false,
  sendBack: false
})
console.log('Connecting to spacebro on ' + settings.service.spacebro.host + ':' + settings.service.spacebro.port)

settings.service.spacebro.inputMessage = settings.service.spacebro.inputMessage || 'new-media-for-etna'
settings.service.spacebro.outputMessage = settings.service.spacebro.outputMessage || 'new-media-from-etna'
spaceBro.on(settings.service.spacebro.client.out.outVideo.eventName, function (data) {
  console.log('video is ready: ' + data.url)
})

setTimeout(function () {
  spaceBro.emit(settings.service.spacebro.client.in.inMedia.eventName, {
    recipe: 'record',
    meta: {
      mjpgStream: 'http://localhost:36700/?action=stream',
      size: '1920x1080',
      duration: 10,
      inputFps: 30,
      outputFps: 30,
      // upsideDown: true,
      useVaapi: true
    }
  })
  console.log('emit ')
}, 2200)

setTimeout(function () {
  spaceBro.emit('etna-stop', {
    option: 'option'
  })
}, 18000)
