'use strict'
const spacebroClient = require('spacebro-client')
var standardSettings = require('standard-settings')
var settings = standardSettings.getSettings()

spacebroClient.connect(settings.service.spacebro.host, settings.service.spacebro.port, {
  clientName: settings.service.spacebro.clientName + '-test',
  channelName: settings.service.spacebro.channelName,
  verbose: false,
  sendBack: false
})

console.log(`Connecting to spacebro on ${settings.service.spacebro.host}:${settings.service.spacebro.port}`)

spacebroClient.on(settings.service.spacebro.outputMessage, function (data) {
  console.log(`video is ready: ${data.url}`)
  process.exit(-1)
})

spacebroClient.on('connect', () => {
  console.log(`spacebro: ${settings.service.spacebro.clientName} connected to ${settings.service.spacebro.host}:${settings.service.spacebro.port}#${settings.service.spacebro.channelName}`)
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
        height: 128,
        keepAudio: false
      },
      thumbnail: {
        position: 5
      }
    }
  })
  console.log(`emit ${settings.service.spacebro.inputMessage}`)
})
