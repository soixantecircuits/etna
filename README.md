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
spacebroClient.emit('new-media-for-etna', {
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

## Recipes

A recipe is an operation on the input media. Like the watermark above, or a crop, or anything you could do on a video or image.

All recipes are in the `recipes` folder.
To use a recipe, mention in in the media sent on spacebro, or in the settings.

## Thumbnail

You often need a thumbnail of the video generated.
If so, you can add in the media meta:

```
meta: {
  thumbnail: {
    position: '50%'
  }
```

Position can be either a float representing a time in seconds, or a percent of the video duration.


## Command-line

You can use etna with the command line with a json file.
You can try the example with

```
node index.js -f example/edit.json
```
