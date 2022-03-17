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
spacebroClient.on(settings.service.spacebro.outputMessage, function (data) {
  console.log('video is ready: ' + data)
  process.exit()
})

// spacebroClient.on('connect', () => {
setTimeout(() => {
  spacebroClient.emit(settings.service.spacebro.inputMessage, {
    recipe: 'addThumbnail',
    path: 'example/calculatedmovements.mp4',
    meta: {
      thumbnail: {
        position: '50%'
        // position: 1.3
      }
    }
  })
  console.log('emit ')
}, 300)
