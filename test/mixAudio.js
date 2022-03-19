'use strict'
const spacebroClient = require('spacebro-client')
var standardSettings = require('standard-settings')
var settings = standardSettings.getSettings()
console.log(settings)
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

spacebroClient.on(settings.service.spacebro.outputMessage, function (data) {
  console.log(`video is ready: ${data.url}`)
  process.exit(-1)
})

spacebroClient.on('connect', () => {
  console.log(
    `spacebro: ${settings.service.spacebro.clientName} connected to ${settings.service.spacebro.host}:${settings.service.spacebro.port}#${settings.service.spacebro.channelName}`
  )
  spacebroClient.emit(settings.service.spacebro.inputMessage || 'inMedia', {
    recipe: 'mixAudio',
    path: 'example/calculatedmovements.mp4',
    meta: {
      audio: 'example/samples_0.mp3'
    }
  })
  console.log(`emit ${settings.service.spacebro.inputMessage}`)
})
