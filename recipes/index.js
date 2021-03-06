'use strict'
var path = require('path')
var recursiveReaddir = require('recursive-readdir')

function ignoreTestFolders (file, stats) {
  // `file` is the absolute path to the file, and `stats` is an `fs.Stats`
  // object returned from `fs.lstat()`.
  return stats.isDirectory() && path.basename(file) === 'test'
}

// require all files in folder
// require('fs').readdirSync(path.join(__dirname, '/')).forEach(function (file) {
recursiveReaddir(path.join(__dirname, '/'), [ignoreTestFolders], function (err, files) {
  if (err) {
    console.log(err)
  }
  files.forEach(function (file) {
    if (file.match(/\.js$/) !== null && file !== 'index.js') {
      var name = file.replace('.js', '')
      // exports[name] = require('./' + file)
      exports[name] = require(file)
    }
  })
})

// helper to require a function without specifying module
exports.recipe = function (name) {
  var fn
  for (var key in exports) {
    if (!fn) {
      fn = exports[key][name]
    } else if (exports[key][name]) {
      console.warn('There are multiple functions named ' + name + '. One was randomly picked, and it is not the one from ' + key + '. You should clean your recipes.')
    }
  }
  if (!fn) {
    var firstModule = exports[Object.keys(exports)[0]]
    fn = firstModule[Object.keys(firstModule)[0]]
    console.warn('There is no function named ' + name + '. One was randomly picked (' + Object.keys(firstModule)[0] + '). Are you missing a recipe in your recipe folder?')
  }
  return fn
}
