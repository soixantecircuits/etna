var moment = require('moment')
const SpacebroClient = require('spacebro-client').SpacebroClient
var standardSettings = require('standard-settings')
var settings = standardSettings.getSettings()
settings.service.spacebro.client.name = settings.service.spacebro.client.name + '-test'
var spacebroClient = new SpacebroClient(settings.service.spacebro)

const id = moment().format('YYYY-MM-DDTHH-mm-ss-SSS')

setTimeout(() => {
  spacebroClient.emit('inMedia', {
    meta: {
      recipe: 'gif',
      gif: {
        fps: 1
      },
      etna: {
        pix_fmt: 'yuvj444p'
      }
    },
    details: {
      frame_001: {
        url: 'https://raw.githubusercontent.com/Flightphase/ofxImageSequence/master/example/bin/data/frame01.png',
        meta: {
          album: {
            id,
            indexInAlbum: 'frame_001'
          }
        }
      },
      frame_002: {
        url: 'https://raw.githubusercontent.com/Flightphase/ofxImageSequence/master/example/bin/data/frame02.png',
        meta: {
          album: {
            id,
            indexInAlbum: 'frame_002'
          }
        }
      },
      frame_003: {
        url: 'https://raw.githubusercontent.com/Flightphase/ofxImageSequence/master/example/bin/data/frame03.png',
        meta: {
          album: {
            id,
            indexInAlbum: 'frame_003'
          }
        }
      },
      frame_004: {
        url: 'https://raw.githubusercontent.com/Flightphase/ofxImageSequence/master/example/bin/data/frame04.png',
        meta: {
          album: {
            id,
            indexInAlbum: 'frame_004'
          }
        }
      }
    }
  })
}, 500)
