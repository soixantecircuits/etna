melt is a demo recipe to use [Shotcut](https://www.shotcut.org/) composition.

## Use

This simple recipe assumes the melt composition consists of a file that
is the same for each rendering (master), and a file that changes at each
rendering (input).

When working on your composition with Shotcut, make sure your master
file is named `master.mp4` and your input file is called `input.mp4`. If
not, edit the .mlt file to change the `resource` properties to those
names.

If you are working on something complex when multiples files would
change at each rendering, copy the melt recipe and edit it according to
your needs.

## Run

A sample js script is here that runs with the demo assets:
`test/test-melt.js`, and reflects all the details.

## .mlt file as string

You can also send the .mlt file as a string in `media.meta.scriptString`.
If you do so, `media.meta.script` will be ignored.

A sample js script is here that runs with the demo assets:
`test/test-melt-string.js`, and reflects all the details.
