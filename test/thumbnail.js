'use strict'
const spacebroClient = require('spacebro-client')
var standardSettings = require('standard-settings')
var settings = standardSettings.getSettings()

spacebroClient.connect(settings.service.spacebro.host, settings.service.spacebro.port, {
  clientName: settings.service.spacebro.clientName + 'test',
  channelName: settings.service.spacebro.channelName,
  verbose: false,
  sendBack: false
})

console.log(`Connecting to spacebro on ${settings.service.spacebro.host}:${settings.service.spacebro.port}`)

spacebroClient.on(settings.service.spacebro.outputMessage, function (data) {
  console.log('video is ready: ' + data.url)
  process.exit()
})

spacebroClient.on('connect', () => {
  console.log(`spacebro: ${settings.service.spacebro.clientName} connected to ${settings.service.spacebro.host}:${settings.service.spacebro.port}#${settings.service.spacebro.channelName}`)
  spacebroClient.emit(settings.service.spacebro.inputMessage, {
    recipe: 'thumbnail',
    input: 'example/calculatedmovements.mp4',
    meta: {
      thumbnail: {
        position: '50%'
        // position: 1.3
      }
    }
  })
  console.log('emit thumbnail')
})
