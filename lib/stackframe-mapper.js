'use strict';

function nodeName(node) {
  var n = node.functionName;
  if (node.url) n += ' ' + node.url + ':' + node.lineNumber;
  return n;
}

function StackFrameMapper(callgraphRoot, categorizer) {
  if (!(this instanceof StackFrameMapper)) return new StackFrameMapper(callgraphRoot, categorizer);

  this._callgraphRoot = callgraphRoot;
  this._categorizer   = categorizer;
  this._frames        = {};
}

var proto = StackFrameMapper.prototype;
module.exports = StackFrameMapper;

proto._addFrame = function addFrame(node, parent, isRoot) {
  var id = node.id;

  // root node has no parent, also protect against circular references
  if (typeof parent === 'undefined' || id === parent) {
    this._frames[id] = { 
        category : this._categorizer.categorize(node.functionName, node.url)
      , name     : nodeName(node)
    };
  } else {
    this._frames[id] = { 
        category : this._categorizer.categorize(node.functionName, node.url)
      , name     : nodeName(node)
      , parent   : parent
    };
  }

  for (var i = 0; i < node.children.length; i++) 
    this._addFrame(node.children[i], id);
}

proto.map = function map() {
  this._addFrame(this._callgraphRoot, undefined);
  return this._frames;
}
