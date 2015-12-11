var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var utils = require('./utils');
var config = require('./config.json');
var io = require('socket.io-client');

var filename;
if(process.argv.indexOf("-f") != -1){ //does our flag exist?
  filename = process.argv[process.argv.indexOf("-f") + 1]; //grab the next item
  var jsonfile = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (jsonfile["edit"]["input"] && jsonfile["edit"]["output"]){
      var proc = ffmpeg()
          .audioCodec('libmp3lame')
          .on('end', function() {
            console.log('files have been merged succesfully');
          })
          .on('error', function(err, stdout, stderr) {
            console.log('an error happened: ' + err.message, stdout, stderr);
          })
          .on('start', function(commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
          });
      jsonfile.edit.input.forEach(function (file){
        proc.input(path.join(path.dirname(filename),file));
      });
      proc.mergeToFile(path.join(path.dirname(filename),jsonfile["edit"]["output"]));
  }
}
else{
  //console.log("Mention a json file: node index.js -f example/edit.json");
  //process.exit(1);
}



var jpg2mp4 = function(input, output, callback){
// HACK USING EXEC INSTEAD OF FLUENT-FFMPEG because there is an issue with spawn and wildcards (*) which are not populated.
//http://stackoverflow.com/questions/11717281/wildcards-in-child-process-spawn

//ffmpeg -framerate 10 -pattern_type glob -i "*.jpg" -c:v libx264 -pix_fmt yuv420p out.mp4
/*
  var proc = ffmpeg()
      .input('\"'+input+'/*.jpg\"')
      .inputOptions('-framerate 10')
      .inputOptions('-pattern_type glob')
      .audioCodec('libmp3lame')
      .videoCodec('libx264')
      .output(output)
      .on('end', function() {
        console.log('files have been merged succesfully');
      })
      .on('error', function(err, stdout, stderr) {
        console.log('an error happened: ' + err.message, stdout, stderr);
      })
      .on('start', function(commandLine) {
        console.log('Spawned Ffmpeg with command: ' + commandLine);
      })

      .run();
*/
  var proc = exec('ffmpeg -y -framerate 10 -pattern_type glob -i "'+path.join(input,'*.jpg"') + ' -c:v libx264 -pix_fmt yuv420p ' + output);
  proc.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
  });

  proc.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
  });

  proc.on('close', function (code) {
      console.log('child process exited with code ' + code);
      if (callback) return callback(null);
  });
}

var crop =  function(input, output, callback){
  //ffmpeg -i steve.mp4 -filter:v "crop=1024:576:0:0" steve_1024.mp4
  var proc = ffmpeg(input)
    .audioCodec('libmp3lame')
    .videoCodec('libx264')
    .fps(25)
    .videoFilters('crop=1024:576:0:0')
    .on('end', function() {
      console.log('files have been cropped succesfully');
      if (callback) return callback(null);
    })
    .on('error', function(err, stdout, stderr) {
      console.log('an error happened: ' + err.message, stdout, stderr);
    })
    .on('start', function(commandLine) {
      console.log('Spawned Ffmpeg with command: ' + commandLine);
    })
    .output(output)
    .run();
}

var overlay =  function(input, output, callback){
  var watermark = "example/gabarit_1024.mov";
  var proc = ffmpeg(input)
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
        //inputs: ['0:0', 'wm'], outputs: 'output'
        inputs: ['0:0', '1:0'], outputs: 'output'
      }], 'output')
    .on('end', function() {
      console.log('files have been overlayed succesfully');
      if (callback) return callback(null);
    })
    .on('error', function(err, stdout, stderr) {
      console.log('an error happened: ' + err.message, stdout, stderr);
    })
    .on('start', function(commandLine) {
      console.log('Spawned Ffmpeg with command: ' + commandLine);
    })
    .output(output)
    .run();

}

var overlay2 =  function(input, output, callback){
  var watermark = "example/gabarit_1024.mov";
  var proc = ffmpeg(input[0])
    .input(input[1])
    .input(watermark)
    .inputOptions('-vcodec qtrle')
    .audioCodec('libmp3lame')
    .videoCodec('libx264')
    .fps(25)
    .complexFilter([

      // Duplicate rescaled stream 3 times into streams a, b, and c
      /*{
        filter: 'fade', options: 'in:0:5:alpha=1',
        inputs: '0:0', outputs: 'mix1'
      },*/
      {
        filter: 'format=pix_fmts=yuva420p,fade', options: 'in:st=5:d=0.2:alpha=1,fade=out:st=6:d=0.2:alpha=1',
        inputs: '1:0', outputs: 'mix2'
      },
      {
        filter: 'overlay', options: 'format=rgb',
        inputs: ['0:0', 'mix2'], outputs: 'mix3'
      },
      {
        filter: 'format=pix_fmts=yuva420p,fade', options: 'in:st=7:d=0.2:alpha=1,fade=out:st=8:d=0.2:alpha=1',
        inputs: '1:0', outputs: 'mix4'
      },
      {
        filter: 'overlay', options: 'format=rgb',
        inputs: ['mix3', 'mix4'], outputs: 'mix5'
      },
      {
        filter: 'format=pix_fmts=yuva420p,fade', options: 'in:st=9:d=0.2:alpha=1,fade=out:st=11:d=0.2:alpha=1',
        inputs: '1:0', outputs: 'mix6'
      },
      {
        filter: 'overlay', options: 'format=rgb',
        inputs: ['mix5', 'mix6'], outputs: 'mix7'
      },

 //in:st=7:d=0.2:alpha=1,fade=out:st=8:d=0.2:alpha=1
      // Create stream 'red' by removing green and blue channels from stream 'a'
      {
        filter: 'overlay', options: 'format=rgb,trim=duration=15',
        inputs: ['mix7', '2:0'], outputs: 'output'
      }], 'output')
    .on('end', function() {
      console.log('files have been overlayed succesfully');
      if (callback) return callback(null);
    })
    .on('error', function(err, stdout, stderr) {
      console.log('an error happened: ' + err.message, stdout, stderr);
    })
    .on('start', function(commandLine) {
      console.log('Spawned Ffmpeg with command: ' + commandLine);
    })
    .output(output)
    .run();
}

var jpg2mp4r = function(input, output, callback){
  var proc = exec('rename "s/\.X[a-zA-Z0-9]+/.jpg/" '+path.join(input,'*.X*'));
  proc.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
  });

  proc.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
  });

  proc.on('close', function (code) {
      console.log('child process exited with code ' + code);
      jpg2mp4(input, output+'-temp.mp4', function(){
        crop(output+'-temp.mp4', output, function(){
            if (callback) return callback(null);
          /*
          overlay(output+'-temp2.mp4', output, function(){
            if (callback) return callback(null);
          });
          */
        });
      });
  });
  
}

/*
jpg2mp4r('/tmp/stream/', 'camera1.mp4', function(){
  console.log("finished video");
});
overlay('camera-crop.mp4', 'camera-overlayed.mp4', function(){
  console.log("finished video");
});
*/
overlay2(['camera-KGaylb1yu-0.mp4', 'camera-KGaylb1yu-1.mp4'], 'shooting-KGaylb1yu.mp4', function(){
  console.log("finished video");
});


utils.connectToService(config.zeroconf.serviceName, function socketioInit(err, address, port) {
    var socket = io('http://' + address + ':' + port);
    socket
      .on('connect', function() {
        console.log('socketio connected.');
      })
      .on('/etna/jpg2mp4r',  function(data){
        jpg2mp4r(data.input, data.output, function(){
          console.log("finished camera");
          socket.emit("/ff-recorder-corner/jpg2mp4r-callback", data);
        });
      })
      .on('/etna/overlay2',  function(data){
        overlay2(data.input, data.output, function(){
          console.log("finished video");
          socket.emit("/ff-recorder-corner/overlay2-callback", data);
        });
      });
});
