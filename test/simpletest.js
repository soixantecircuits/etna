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

spacebroClient.on('outVideo', function (data) {
  console.log(`video is ready: ${data.url}`)
  process.exit(-1)
})

spacebroClient.on('connect', () => {
  console.log(
    `spacebro: ${settings.service.spacebro.client.name} connected to ${settings.service.spacebro.host}:${settings.service.spacebro.port}#${settings.service.spacebro.channelName}`
  )
  spacebroClient.emit('inMedia', {
    recipe: 'watermark',
    path: 'example/calculatedmovements.mp4',
    // meta: {watermark: 'example/pacman.mov'}
    // meta: {watermark: 'assets/watermark.png'}
    meta: {
      '//watermark': {
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
      watermark: {
        path: 'assets/watermark.png'
      },
      thumbnail: {
        position: 5
      }
    }
  })
  console.log('* - emited inMedia')
})
