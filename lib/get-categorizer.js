'use strict';

var categorizers = [ 
    require('./categorizer-iojs-node')
  , require('./categorizer-default')
]


module.exports = function getCategorizer(cpuprofile) {
  var title = cpuprofile.title
    , bottomFunction = cpuprofile.head && cpuprofile.head.functionName
    , indicators = []

  // i.e. iojs -profile 1ms --> iojs
  if (title && title.length) indicators.push(title.split(' ')[0]);
  if (bottomFunction) indicators.push(bottomFunction);

  for (var i = 0; i < categorizers.length; i++) 
    if (categorizers[i].canCategorize(indicators)) return categorizers[i](cpuprofile, indicators);
}
