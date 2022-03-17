'use strict'
const spaceBro = require('spacebro-client')
const path = require('path')
var settings = require('standard-settings').getSettings()

spaceBro.connect(settings.service.spacebro.host, settings.service.spacebro.port, {
  client: {
    name: settings.service.spacebro.clientName + '-test'
  },
  channelName: settings.service.spacebro.channelName,
  verbose: false,
  sendBack: false
})
console.log('Connecting to spacebro on ' + settings.service.spacebro.host + ':' + settings.service.spacebro.port)

spaceBro.on(settings.service.spacebro.client.out.outVideo.eventName, function (data) {
  console.log('video is ready: ' + data.url)
})

spaceBro.on('connect', function () {
  spaceBro.emit(settings.service.spacebro.client.in.inMedia.eventName, {
    path: 'example/pacman.mov',
    output: path.join(settings.folder.output, 'edit.mp4'),
    recipe: 'melt',
    meta: {
      melt: {
        master: 'example/laplage.mp4'
      }
    },
    details: {
      1: {
        path: 'example/calculatedmovements.mp4'
      },
      2: {
        path: 'example/calculatedmovements.mp4'
      }
    }
  })
  console.log('emit ')
})

setTimeout(function () {
  spaceBro.emit('stopLastProcess', {
    option: 'option'
  })
  console.log('stop')
}, 5000)
