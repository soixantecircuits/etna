A cli tool to do video editing using [spacebro](https://github.com/spacebro/spacebro)
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

If you need to change settings,
Copy settings.default.json to settings.json

```
cp settings/settings.default.json settings/settings.json
```

And edit settings.json
You can also change settings with argv parameters.
Learn more about this on [standard-settings](https://github.com/soixantecircuits/standard-settings)

## Spacebro

You can use etna by sending commands via spacebro.
The example above watermarks a video

```
spaceBro.emit('new-media-for-etna', {
  recipe: 'watermark',
  input: 'example/calculatedmovements.mp4',
  params: {watermark: 'example/pacman.mov'}
})

```

For a full working example, look at `test/simpletest.js`

Start etna:

```
node index.js
```

and start the example script

```
node test/simpletest.js
```

## Command-line

You can use etna with the command line with a json file.
You can try the example with

```
node index.js -f example/edit.json
```
