'use strict';

function nodeName(node) {
  var n = node.functionName;
  if (node.url) n += ' ' + node.url + ':' + node.lineNumber;
  return n;
}

function StackFrameMapper(callgraphRoot, category) {
  if (!(this instanceof StackFrameMapper)) return new StackFrameMapper(callgraphRoot, category);

  this._callgraphRoot = callgraphRoot;
  this._category = category;
  this._frames = {};
}

var proto = StackFrameMapper.prototype;
module.exports = StackFrameMapper;

proto._addFrame = function addFrame(node, parent, isRoot) {
  if (isRoot) {
    this._frames[node.id] = { 
        category : this._category
      , name     : nodeName(node)
    };
  } else {
    this._frames[node.id] = { 
        category : this._category
      , name     : nodeName(node)
      , parent   : parent
    };
  }

  for (var i = 0; i < node.children.length; i++) 
    this._addFrame(node.children[i], node.id);
}

proto.map = function map() {
  this._addFrame(this._callgraphRoot, undefined, true);
  return this._frames;
}
