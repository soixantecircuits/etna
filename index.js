var ffmpeg = require('fluent-ffmpeg')
var fs = require('fs')
var path = require('path')
var exec = require('child_process').exec
var utils = require('./utils')
var config = require('./config.json')
var io = require('socket.io-client')
var mkdirp = require('mkdirp')
const spaceBro = require('spacebro-client')

mkdirp(config.output.folder)
var tmpfolder = '/tmp/videos/'
mkdirp(tmpfolder)

var filename
if (process.argv.indexOf('-f') !== -1) { // does our flag exist?
  filename = process.argv[process.argv.indexOf('-f') + 1] // grab the next item
  var jsonfile = JSON.parse(fs.readFileSync(filename, 'utf8'))
  if (jsonfile['edit']['input'] && jsonfile['edit']['output']) {
    var proc = ffmpeg()
      .audioCodec('libmp3lame')
      .on('end', function () {
        console.log('files have been merged succesfully')
      })
      .on('error', function (err, stdout, stderr) {
        console.log('an error happened: ' + err.message, stdout, stderr)
      })
      .on('start', function (commandLine) {
        console.log('Spawned Ffmpeg with command: ' + commandLine)
      })
    jsonfile.edit.input.forEach(function (file) {
      proc.input(path.join(path.dirname(filename), file))
    })
    proc.mergeToFile(path.join(path.dirname(filename), jsonfile['edit']['output']))
  }
} else {
  // console.log("Mention a json file: node index.js -f example/edit.json")
  // process.exit(1)
}

var jpg2mp4 = function (input, output, callback) {
  // HACK USING EXEC INSTEAD OF FLUENT-FFMPEG because there is an issue with spawn and wildcards (*) which are not populated.
  // http://stackoverflow.com/questions/11717281/wildcards-in-child-process-spawn

  // ffmpeg -framerate 10 -pattern_type glob -i "*.jpg" -c:v libx264 -pix_fmt yuv420p out.mp4
  /*
    var proc = ffmpeg()
        .input('\"'+input+'/*.jpg\"')
        .inputOptions('-framerate 10')
        .inputOptions('-pattern_type glob')
        .audioCodec('libmp3lame')
        .videoCodec('libx264')
        .output(output)
        .on('end', function() {
          console.log('files have been merged succesfully')
        })
        .on('error', function(err, stdout, stderr) {
          console.log('an error happened: ' + err.message, stdout, stderr)
        })
        .on('start', function(commandLine) {
          console.log('Spawned Ffmpeg with command: ' + commandLine)
        })

        .run()
  */
  var proc = exec('ffmpeg -y -framerate 10 -pattern_type glob -i "' + path.join(input, '*.jpg"') + ' -c:v libx264 -pix_fmt yuv420p ' + output)
  proc.stdout.on('data', function (data) {
    console.log('stdout: ' + data)
  })

  proc.stderr.on('data', function (data) {
    console.log('stderr: ' + data)
  })

  proc.on('close', function (code) {
    console.log('child process exited with code ' + code)
    if (callback) return callback(null)
  })
}

var crop = function (input, output, params, callback) {
  // ffmpeg -i steve.mp4 -filter:v "crop=1024:576:0:0" steve_1024.mp4
  params = params || '1024:576:0:0'
  ffmpeg(input)
    .audioCodec('libmp3lame')
    .videoCodec('libx264')
    .fps(25)
    .videoFilters('crop=' + params)
    .on('end', function () {
      console.log('files have been cropped succesfully')
      if (callback) return callback(null)
    })
    .on('error', function (err, stdout, stderr) {
      console.log('an error happened: ' + err.message, stdout, stderr)
    })
    .on('start', function (commandLine) {
      console.log('Spawned Ffmpeg with command: ' + commandLine)
    })
    .output(output)
    .run()
}

var crop_and_add_soundtrack = function (input, output, cropParams, audioOffset, callback) {
  // ffmpeg -i steve.mp4 -filter:v "crop=1024:576:0:0" steve_1024.mp4
  ffmpeg.ffprobe(input[0], function (err, data) {
    if(err) {
      console.err(err)
    } else {
      var duration = data.format.duration
      var ss =  audioOffset - duration
      cropParams = cropParams || '1024:576:0:0'
      ffmpeg(input[0])
        .input(input[1])
        .inputOptions('-ss ' + ss)
        .outputOptions('-map 0:v')
        .outputOptions('-map 1:a')
        .outputOptions('-shortest')
        .outputOptions('-strict -2')
        //.audioCodec('libmp3lame')
        .videoCodec('libx264')
        .fps(25)
        .videoFilters('crop=' + cropParams)
        .on('end', function () {
          console.log('files have been cropped succesfully')
          if (callback) return callback(null)
        })
        .on('error', function (err, stdout, stderr) {
          console.log('an error happened: ' + err.message, stdout, stderr)
        })
        .on('start', function (commandLine) {
          console.log('Spawned Ffmpeg with command: ' + commandLine)
        })
        .output(output)
        .run()
    }
  })
}

var overlay = function (input, output, callback) {
  var watermark = 'example/gabarit_1024.mov'
  ffmpeg(input)
    .input(watermark)
    .inputOptions('-vcodec qtrle')
    .audioCodec('libmp3lame')
    .videoCodec('libx264')
    .complexFilter([

      /*
      // Duplicate rescaled stream 3 times into streams a, b, and c
      {
        filter: 'fade', options: 'out:25:24:alpha=1',
        inputs: '1:0', outputs: 'wm'
      },*/

      // Create stream 'red' by removing green and blue channels from stream 'a'
      {
        filter: 'overlay', options: 'format=rgb',
        // inputs: ['0:0', 'wm'], outputs: 'output'
        inputs: ['0:0', '1:0'], outputs: 'output'
      }], 'output')
    .on('end', function () {
      console.log('files have been overlayed succesfully')
      if (callback) return callback(null)
    })
    .on('error', function (err, stdout, stderr) {
      console.log('an error happened: ' + err.message, stdout, stderr)
    })
    .on('start', function (commandLine) {
      console.log('Spawned Ffmpeg with command: ' + commandLine)
    })
    .output(output)
    .run()
}

var overlay2 = function (input, output, callback) {
  var watermark = 'example/gabarit_1024.mov'
  /*
  var timecodes = [
    [3, 3.5],
    [4.5, 9],
    [11, 13],
  ]
  */
  var timecodes = [
    [5.3, 5.6],
    [5.9, 6.2],
    [7, 10],
    [12, 13]
  ]
  var fade_duration = 0.2

  var complexFilter = []
  timecodes.forEach(function (element, i) {
    var input0, input1, output0
    if (i === 0) {
      input0 = '0:0'
      input1 = 'mix' + i
      output0 = 'mix' + (i + 1)
    } else {
      input0 = 'mix' + (i * 2 - 1)
      input1 = 'mix' + (i * 2)
      output0 = 'mix' + (i * 2 + 1)
    }

    // st= time wher the fadein starts
    // d= duration of the fadein
    complexFilter.push({
      filter: 'format=pix_fmts=yuva420p,fade', options: 'in:st=' + element[0] + ':d=' + fade_duration + ':alpha=1,fade=out:st=' + element[1] + ':d=' + fade_duration + ':alpha=1',
      inputs: '1:0', outputs: input1
    },
      {
        filter: 'overlay', options: 'format=rgb',
        inputs: [input0, input1], outputs: output0
      })
  })
  complexFilter.push({
    filter: 'overlay', options: 'format=rgb,trim=duration=16.8', // edited from 15
    inputs: ['mix' + ((timecodes.length - 1) * 2 + 1), '2:0'], outputs: 'output'
  })

  ffmpeg(input[0])
    .input(input[1])
    .input(watermark)
    .inputOptions('-vcodec qtrle')
    .audioCodec('libmp3lame')
    .videoCodec('libx264')
    .fps(25)
    .complexFilter(complexFilter, 'output')
    .outputOptions('-pix_fmt yuv420p')
    .on('end', function () {
      console.log('files have been overlayed succesfully')
      if (callback) return callback(null)
    })
    .on('error', function (err, stdout, stderr) {
      console.log('an error happened: ' + err.message, stdout, stderr)
    })
    .on('start', function (commandLine) {
      console.log('Spawned Ffmpeg with command: ' + commandLine)
    })
    .output(output)
    .run()
}

var pingpong = function (input, output, callback) {
    var bitrate = 6000
    var videoCodec = 'libx264'
    outputOptions = [
      '-movflags +faststart',
      '-threads 0',
      '-pix_fmt yuv420p',
      //'-gifflags -transdiff -y',
      //'-vcodec ' + bitrate + 'k',
      '-maxrate ' + bitrate + 'k',
      '-bufsize ' + 2 * bitrate + 'k'
    ]
    var command = ffmpeg()
      .addInput(path.join(input,"%*.jpg"))
      .addInput("assets/watermark.png")

    command
      //.complexFilter(['overlay=shortest=1'])
      .inputFPS(config.pingpong.inputFramerate)
      .fps(25)
      .on('error', function(err) {
        console.log('An error occurred while merging: ', err);
      })
      .on('progress', function(progress) {
        var date = Date();
        console.log(date.substr(16, date.length) + ' - Processing generation');
      })
      .on('end', function() {
        console.log('ffmpeg - finished to layer images');
      })

    if (config.pingpong.loops > 0) {
      // ffmpeg -i out.mp4 -filter_complex "[0]reverse[r];[0][r]concat,loop=5:250,setpts=N/25/TB" output.mp4
      console.log("use pingpong loops")
      command.complexFilter([
        '[0]reverse[r];[0][r]concat,loop=' + config.pingpong.loops + ':250,setpts=N/'+config.pingpong.inputFramerate+'/TB[pingpong]',
        '[pingpong]crop=in_h:in_h:(in_w-in_h)/2:0[c]',
        '[c][1] overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2,scale=640:640'
      ])
    }
    if (config.pingpong.gif !== true) {
      command
        .videoCodec(videoCodec)
        .outputOptions(outputOptions)
    }

    command.save(output)
}

var jpg2mp4r = function (input, output, callback) {
  var proc = exec('rename "s/\.X[a-zA-Z0-9]+/.jpg/" ' + path.join(input, '*.X*'))
  proc.stdout.on('data', function (data) {
    console.log('stdout: ' + data)
  })

  proc.stderr.on('data', function (data) {
    console.log('stderr: ' + data)
  })

  proc.on('close', function (code) {
    console.log('child process exited with code ' + code)
    jpg2mp4(input, output + '-temp.mp4', function () {
      crop(output + '-temp.mp4', output, '1024:576:0:0', function () {
        if (callback) return callback(null)
      /*
      overlay(output+'-temp2.mp4', output, function(){
        if (callback) return callback(null)
      })
      */
      })
    })
  })
}

/*
jpg2mp4r('/tmp/stream/', 'camera1.mp4', function(){
  console.log("finished video")
})
overlay('camera-crop.mp4', 'camera-overlayed.mp4', function(){
  console.log("finished video")
})
overlay2(['camera-B_a@gBSEb-0.mp4', 'camera-B_a@gBSEb-1.mp4'], 'shooting-B_a@gBSEb.mp4', function(){
  console.log("finished video")
})
var in_w = 1920
var in_h = 1080
var topbar_h = 160
var bottombar_h = 6
var out_h = in_h - (topbar_h + bottombar_h)
var out_w = out_h * 16 / 9.0
var y = topbar_h
var x = (in_w - out_w) / 2.0
var param = out_w + ':' + out_h + ':' + x + ':' + y
crop('example/laure.mp4', 'example/manifeste-crop.mp4', param, function () {
  console.log('finished video')
})
*/
/*
var inputFile = 'example/laure.mp4'
var audioFile = 'example/caruso.mp4'
ffmpeg.ffprobe(inputFile, function (err, data) {
  if(err) {
    console.err(err)
  } else {
    var duration = data.format.duration
    var audioOffset = 3 * 60 + 35.5
    //var audioOffset = 3 * 60 + 33
    var ss =  audioOffset - duration
    params = '1024:576:0:0'
    ffmpeg(inputFile)
        .input(audioFile)
        .inputOptions('-ss ' + ss)
        //.outputOptions('-c copy')
        .outputOptions('-map 0:v')
        .outputOptions('-map 1:a')
        .outputOptions('-shortest')
        .outputOptions('-strict -2')
        .videoFilters('crop=' + params)
        .on('end', function () {
          console.log('files have been overlayed succesfully')
          // if (callback) return callback(null)
        })
        .on('error', function (err, stdout, stderr) {
          console.log('an error happened: ' + err.message, stdout, stderr)
        })
        .on('start', function (commandLine) {
          console.log('Spawned Ffmpeg with command: ' + commandLine)
        })
        .output('example/output-etna.mp4')
        .run()

  }
})
*/

/*
var audioOffset = 3 * 60 + 35.5
crop_and_add_soundtrack(['example/laure.mp4', 'example/caruso.mp4'], 'example/output-etna.mp4', '1024:576:0:0', audioOffset) 
*/

spaceBro.connect('localhost', 8888, {
  clientName: 'etna',
  channelName: 'zhaoxiangjs',
  /*packers: [{ handler: function handler (args) {
      return console.log(args.eventName, '=>', args.data)
  } }],
  unpackers: [{ handler: function handler (args) {
      return console.log(args.eventName, '<=', args.data)
  } }],*/
  verbose: false,
  sendBack: false
})

spaceBro.on ('album-saved', function (data) {
  if (data.src) {
    console.log('new album: ', data.src)
    pingpong(data.src, path.join(config.output.folder, path.relative(path.dirname(data.src), data.src) + '.gif'), function () {
        console.log('finished video')
    })

  }
})

setTimeout(function(){
  //spaceBro.emit('album-saved', {src:'/tmp/.temp/g6risryj7ef' } )
  spaceBro.emit('album-saved', {src:'/tmp/ad1ist2qkok' } )
  console.log('emit ')
}, 300)


// deprecated, use spacebro now
if (config.zeroconf) {
  utils.connectToService(config.zeroconf.serviceName, function socketioInit (err, address, port) {
    if (err) {
      console.log(err.stack)
    }
    var socket = io('http://' + address + ':' + port)
    socket
      .on('connect', function () {
        console.log('socketio connected.')
      })
      .on('/etna/jpg2mp4r', function (data) {
        jpg2mp4r(data.input, data.output, function () {
          console.log('finished camera')
          socket.emit('/ff-recorder-corner/jpg2mp4r-callback', data)
        })
      })
      .on('/etna/overlay', function (data) {
        overlay(data.input, data.output, function () {
          console.log('finished video')
          socket.emit('/ff-recorder-corner/overlay-callback', data)
        })
      })
      .on('/etna/overlay2', function (data) {
        overlay2(data.input, data.output, function () {
          console.log('finished video')
          socket.emit('/ff-recorder-corner/overlay2-callback', data)
        })
      })
  })
}
