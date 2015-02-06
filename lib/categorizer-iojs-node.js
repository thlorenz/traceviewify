'use strict';

function IojsNodeCategorizer(indicators) {
  if (!(this instanceof IojsNodeCategorizer)) return new IojsNodeCategorizer(indicators);
  this._cache = {};
}

var proto = IojsNodeCategorizer.prototype;
proto.categories = [
    { regex: /^uv_/                        , name: 'libuv' }
  , { regex: /^http_/                      , name: 'http_parser' }
  , { regex: /^v8::/                       , name: 'v8' }
  , { regex: /^lib/                        , name: 'system' }
  , { regex: /^iojs::/                     , name: 'io.js' }
  , { regex: /^(?:\*|\~|native )|\.js/          , name: 'JavaScript' }
  , { regex: /^(?:node::|void node::|_register_tty|start)/ , name: 'node' }
]

proto.categorize = function categorize(name, url) {
  var category, found;
  if (/\.js$/.test(url)) return 'JavaScript';

  if (!this._cache[name]) {
    for (var i = 0; i < this.categories.length; i++) {
      category = this.categories[i];
      if (category.regex.test(name)) {
        found = category.name;
        break;
      }
    }
    found = found || 'Unknown';
    this._cache[name] = found;
  }
  return this._cache[name];
}

exports = module.exports = IojsNodeCategorizer; 
exports.canCategorize = function canCategorize(indicators) {
  return ~indicators.indexOf('iojs') || ~indicators.indexOf('node');
}
