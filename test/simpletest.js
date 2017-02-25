'use strict'
var config = require('./../config.json')
const spaceBro = require('spacebro-client')

config.spacebro = config.spacebro || {}
config.spacebro.host = config.spacebro.host || 'spacebro.space'
config.spacebro.port = config.spacebro.port || 3333
config.spacebro.clientName = config.spacebro.clientName || 'etna'
config.spacebro.channelName = config.spacebro.channelName || 'etna'

spaceBro.connect(config.spacebro.host, config.spacebro.port, {
  clientName: config.spacebro.clientName,
  channelName: config.spacebro.channelName,
  verbose: false,
  sendBack: false
})

config.spacebro.inputMessage = config.spacebro.inputMessage || 'new-media-for-etna'
config.spacebro.outputMessage = config.spacebro.outputMessage || 'new-media-from-etna'
spaceBro.on(config.spacebro.outputMessage, function (data) {
  console.log('video is ready: ' + data.output)
})

setTimeout(function () {
  spaceBro.emit(config.spacebro.inputMessage, {
    recipe: 'watermark',
    input: 'example/calculatedmovements.mp4',
    params: {watermark: 'example/pacman.mov'}
  })
  console.log('emit ')
}, 300)
