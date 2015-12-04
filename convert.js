var ffmpeg = require('fluent-ffmpeg');

var files = ['example/laplage.mp4', 'example/rythm21.mp4', 'example/calculatedmovements.mp4'];

files.forEach(function(file){
  console.log(file);
// make sure you set the correct path to your video file
var proc = ffmpeg(file)
  // set custom option
  .addOption('-vf', 'scale=640x360,setsar=1:1')
  // set video bitrate
  .videoBitrate(1024)
  // set target codec
  .videoCodec('libx264')
  // set aspect ratio
  .aspect('16:9')
  // set size in percent
  //.size('640x360,setsar=0:1')
  // set fps
  .fps(24)
  // set audio bitrate
  .audioBitrate('128k')
  // set audio codec
  .audioCodec('libmp3lame')
  // set number of audio channels
  .audioChannels(2)
  // set output format to force
  .format('mp4')
  // setup event handlers
  .on('end', function() {
    console.log('file has been converted succesfully');
  })
  .on('error', function(err, stdout, stderr) {
    console.log('an error happened: ' + err.message, stdout, stderr);
  })
  .on('start', function(commandLine) {
    console.log('Spawned Ffmpeg with command: ' + commandLine);
  })
  // save to file
  .save(file + '_c.mp4');
});
