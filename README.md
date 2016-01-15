A cli tool to do video editing using json files.
Made with nodejs and ffmpeg.

# How to

## Requires

Install ffmpeg

`
sudo add-apt-repository ppa:kirillshkrogalev/ffmpeg-next && sudo apt-get update -qq
sudo apt-get update
sudo apt-get install ffmpeg
`

Install npm packages

```
npm i
```

Copy config.example.json to config.json

```
cp config.example.json config.json
```

## Command-line

You can use etna with the command line with a json file.
You can try the example with

```
node index.js -f example/edit.json
```

## Socket-io

You can use etna by sending commands via socket-io.
The example above processes an edit between the two videos with a hard-coded overlay video.

```
      io.emit('/etna/overlay2', {
        input:[
          'video0.mp4',
          'video1.mp4'
         ],
         output: 'shooting.mp4'
      });

```
