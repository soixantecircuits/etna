'use strict'
// require all files in folder
require('fs').readdirSync(__dirname + '/').forEach(function(file) {
  if (file.match(/\.js$/) !== null && file !== 'index.js') {
    var name = file.replace('.js', '');
    exports[name] = require('./' + file);
  }
})

exports.recipe = function (name) {
	var fn
  for(var key in exports) {
    if (!fn) {
			fn = exports[key][name]
    } else if (exports[key][name]) {
			console.warn('There is two functions named ' + name + '. One was randomly picked. You should clean your recipes.')
		}
  }
  if (!fn) {
    var firstModule = exports[Object.keys(exports)[0]]
    fn = firstModule[Object.keys(firstModule)[0]]
    console.warn('There is no function named ' + name + '. One was randomly picked (' + Object.keys(firstModule)[0] +'). Are you missing a recipe in your recipe folder?')
  }
  return fn
}
