var ffmpeg = require('fluent-ffmpeg');

/*
 replicates this sequence of commands:

 ffmpeg -i title.mp4 -qscale:v 1 intermediate1.mpg
 ffmpeg -i source.mp4 -qscale:v 1 intermediate2.mpg
 ffmpeg -i concat:"intermediate1.mpg|intermediate2.mpg" -c copy intermediate_all.mpg
 ffmpeg -i intermediate_all.mpg -qscale:v 2 output.mp4

 Create temporary .mpg files for each video and deletes them after merge is completed.
 These files are created by filename pattern like [videoFilename.ext].temp.mpg [outputFilename.ext].temp.merged.mp4
 */

var firstFile = "example/calculatedmovements.mp4_c.mp4";
var secondFile = "example/laplage.mp4_c.mp4";
var thirdFile = "example/rythm21.mp4_c.mp4";
var outPath = "example/concat.mp4";

var proc = ffmpeg(firstFile)
    .input(secondFile)
    .input(thirdFile)
    //.input(fourthFile)
    //.input(...)
    .audioCodec('libmp3lame')
    .on('end', function() {
      console.log('files have been merged succesfully');
    })
    .on('error', function(err, stdout, stderr) {
      console.log('an error happened: ' + err.message, stdout, stderr);
    })
    .on('start', function(commandLine) {
      console.log('Spawned Ffmpeg with command: ' + commandLine);
    })
    .mergeToFile(outPath);
