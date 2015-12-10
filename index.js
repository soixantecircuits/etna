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
  var proc = exec('ffmpeg -y -framerate 10 -pattern_type glob -i "'+input+'*.jpg" -c:v libx264 -pix_fmt yuv420p ' + output);
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

var jpg2mp4r = function(input, output, callback){
  var proc = exec('rename "s/\.X[a-zA-Z0-9]+/.jpg/" '+input+'*.X*');
  proc.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
  });

  proc.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
  });

  proc.on('close', function (code) {
      console.log('child process exited with code ' + code);
      jpg2mp4(input, output, function(){
        if (callback) return callback(null);
      });
  });
  
}

/*
jpg2mp4r('/tmp/stream/', 'camera1.mp4', function(){
  console.log("finished video");
});
*/


utils.connectToService(config.zeroconf.serviceName, function socketioInit(err, address, port) {
    var socket = io('http://' + address + ':' + port);
    socket
      .on('connect', function() {
        console.log('socketio connected.');
      })
      .on('/etna/jpg2mp4r',  function(data){
        jpg2mp4r(data.input, data.output, function(){
          console.log("finished video");
        });
      });
});
