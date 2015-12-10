var ffmpeg = require('fluent-ffmpeg');


//var background = "example/calculatedmovements_hd.mp4";
//var background = "example/TGVO0053.mov";
var background = "example/steve.mp4";
var background = "example/steve_1024.mp4";
//var watermark = "example/pacman.mov";
//var watermark = "example/gabarit_hd.mov";
var watermark = "example/video-twitter-gabarit2.mov";
var watermark = "example/gabarit_1024.mov";

var proc = ffmpeg(background)
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
      console.log('files have been merged succesfully');
    })
    .on('error', function(err, stdout, stderr) {
      console.log('an error happened: ' + err.message, stdout, stderr);
    })
    .on('start', function(commandLine) {
      console.log('Spawned Ffmpeg with command: ' + commandLine);
    })
    .output('example/fluenttest.mp4')
    .run();

