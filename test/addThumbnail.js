'use strict'
const spacebroClient = require('spacebro-client')
var standardSettings = require('standard-settings')
var settings = standardSettings.getSettings()

spacebroClient.connect(
  settings.service.spacebro.host,
  settings.service.spacebro.port,
  {
    client: {
      name: settings.service.spacebro.client.name + '-test'
    },
    channelName: settings.service.spacebro.channelName,
    verbose: false,
    sendBack: false
  }
)

console.log(
  `Connecting to spacebro on ${settings.service.spacebro.host}:${settings.service.spacebro.port}`
)

spacebroClient.on('connect', () => {
  console.log(
    `spacebro: ${settings.service.spacebro.clientName} connected to ${settings.service.spacebro.host}:${settings.service.spacebro.port}#${settings.service.spacebro.channelName}`
  )
})

settings.service.spacebro.inputMessage =
  settings.service.spacebro.inputMessage || 'inMedia'
settings.service.spacebro.outputMessage =
  settings.service.spacebro.outputMessage || 'outVideo'
console.log(settings.service.spacebro.outputMessage)
spacebroClient.on(settings.service.spacebro.outputMessage, function (data) {
  console.log('video is ready: ', data)
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
  console.log(`* - emited ${settings.service.spacebro.inputMessage}`)
}, 300)
