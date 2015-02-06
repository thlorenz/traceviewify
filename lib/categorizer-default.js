'use strict';

function DefaultCategorizer(indicators) {
  if (!(this instanceof DefaultCategorizer)) return new DefaultCategorizer(indicators);

  this._category = indicators[0] || 'CPU';
}

var proto = DefaultCategorizer.prototype;

proto.categorize = function categorize(name) {
  return this._category;
}

exports = module.exports = DefaultCategorizer; 
exports.canCategorize = function canCategorize() {
  // we get called when all other categorizers passed
  return true;
}
