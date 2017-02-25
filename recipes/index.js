'use strict'
var path = require('path')

// require all files in folder
require('fs').readdirSync(path.join(__dirname, '/')).forEach(function (file) {
  if (file.match(/\.js$/) !== null && file !== 'index.js') {
    var name = file.replace('.js', '')
    exports[name] = require('./' + file)
  }
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
