'use strict'
const spacebroClient = require('spacebro-client')
var nconf = require('nconf')
require('standard-settings')
var settings = nconf.get()

settings.service.spacebro = settings.service.spacebro || {}
settings.service.spacebro.host = settings.service.spacebro.host || 'spacebro.space'
settings.service.spacebro.port = settings.service.spacebro.port || 3333
settings.service.spacebro.clientName = settings.service.spacebro.clientName || 'etna'
settings.service.spacebro.channelName = settings.service.spacebro.channelName || 'etna'

spacebroClient.connect(settings.service.spacebro.host, settings.service.spacebro.port, {
  clientName: settings.service.spacebro.clientName + 'test',
  channelName: settings.service.spacebro.channelName,
  verbose: false,
  sendBack: false
})

console.log(`Connecting to spacebro on ${settings.service.spacebro.host}:${settings.service.spacebro.port}`)

spacebroClient.on('connect', () => {
  console.log(`spacebro: ${settings.service.spacebro.clientName} connected to ${settings.service.spacebro.host}:${settings.service.spacebro.port}#${settings.service.spacebro.channelName}`)
})

settings.service.spacebro.inputMessage = settings.service.spacebro.inputMessage || 'new-media-for-etna'
settings.service.spacebro.outputMessage = settings.service.spacebro.outputMessage || 'new-media-from-etna'
spaceBro.on(settings.service.spacebro.outputMessage, function (data) {
  console.log('video is ready: ' + data.url)
  // process.exit()
})

spacebroClient.on('connect', () => {
  spacebroClient.emit(settings.service.spacebro.inputMessage, {
    recipe: 'watermark',
    input: 'example/calculatedmovements.mp4',
    // meta: {watermark: 'example/pacman.mov'}
    // meta: {watermark: 'assets/watermark.png'}
    meta: {
      watermark: {
        path: 'assets/watermark.png',
        start: 0,
        end: 10,
        fadeDuration: 0.5,
        x: 30,
        y: 100,
        width: 234,
        height: 128
      }
    }
  })
  console.log('emit ')
}, 300)
setTimeout(function () {
  spaceBro.emit(settings.service.spacebro.inputMessage, {
    recipe: 'watermark',
    path: 'assets/picture.png',
    meta: {
      watermark: {
        path: 'example/pacman.mov',
        start: 0,
        end: 3,
        fadeDuration: 0.5,
        x: 200,
        y: 200,
        width: 200,
        height: 200,
        keepAudio: false
      }
    }
  })
  console.log(`emit ${settings.service.spacebro.inputMessage}`)
})
