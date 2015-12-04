var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var path = require('path');

var filename;
if(process.argv.indexOf("-f") != -1){ //does our flag exist?
      filename = process.argv[process.argv.indexOf("-f") + 1]; //grab the next item
}
else{
  console.log("Mention a json file: node index.js -f example/edit.json");
  process.exit(1);
}

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
