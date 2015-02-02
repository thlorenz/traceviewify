'use strict';

function getParentIds(frames, node) {
  var acc = [], id;
  while(node.parent) {
    id = node.parent;
    node = frames[id];
    acc.push(id);
  }
  return acc;
}

function SampleMapper(frames, startTime, endTime, samples, name, pid, tid, cpu) {
  if (!(this instanceof SampleMapper)) return new SampleMapper(frames, startTime, endTime, samples, name, pid, tid, cpu);

  this._frames       = frames;
  this._startTime    = startTime;
  this._endTime      = endTime;
  this._samplesIn    = samples;
  this._samplesInLen = this._samplesIn.length;
  this._tickLen      = (this._endTime - this._startTime) / this._samplesInLen

  this._name = name;
  this._pid  = pid;
  this._tid  = tid;
  this._cpu  = cpu;

  this._inside      = {};
  this._infos       = []
  this._events      = []
  this._prevInfo    = null
  this._currentTick = 0
  this._samples         = []

  this._previousFunctionExit = undefined
  this._previousFunctionId = undefined;
}

var proto = SampleMapper.prototype;
module.exports = SampleMapper;

proto.map = function map() {
  this._consolidateSamples();
  return this._processInfos();
}

proto._consolidateSamples = function _consolidateSamples() {
  // Consolidate cases in which the same script ID appears in a row
  // In that case we'll increase it's ticks count
  var prevId = -1, prevInfo;
  for (var i = 0; i < this._samplesInLen; i++) {
    if (this._samplesIn[i] === prevId) {
      prevInfo.ticks++;
    } else {
      prevId = this._samplesIn[i];
      prevInfo = { id: prevId, ticks: 1 };
      this._infos.push(prevInfo);
    }
  }
}

proto._addSample = function _addSample(info, timestamp) {
    this._samples.push({
        name   : this._name
      , weight : info.ticks * this._tickLen
      , ts     : timestamp 
      , sf     : info.id
      , tid    : this._tid
      , cpu    : this._cpu
    })
}

proto._maybeExitPreviousFunction = function _maybeExitPreviousFunction(parentIds) {

  // Only if the previous leaf function is not part of the parents anymore did we actually exit it
  if (this._previousFunctionExit && !~parentIds.indexOf(this._previousFunctionId)) {
    this._events.push(this._previousFunctionExit)
    this._inside[this._previousFunctionId] = false;
  }
}

proto._exitParentsNowOffStack = function _exitParentsNowOffStack(parentIds, info) {
  // Some functions were part of the stack of the previous function, but aren't part 
  // of the stack of the current one.
  // Therefore we need to emit exit events for them.

  var insideKeys = Object.keys(this._inside), id, k
  for (var j = 0; j < insideKeys.length; j++) {
    k = insideKeys[j];
    id = parseInt(k);
    if (this._inside[k] && id !== info.id && k !== this._previousFunctionId && !~parentIds.indexOf(id)) {
      this._events.push({
          name : this._frames[k].name
        , cat  : this._name 
        , ph   : 'E'
        , pid  : this._pid
        , tid  : this._tid
        , ts   : this._previousFunctionExit.ts
        , args : {}
      })

      this._inside[k] = false;
    }
  }
}

proto._enterParentsNewOnStack = function _enterParentsNewOnStack(parentIds, timestamp) {

  // We might have entered parent functions that called the current function
  // Ensure to raise an event that they have been entered
  for (var j = parentIds.length - 1; j >= 0; j--) {
    var id = parentIds[j];
    if (!this._inside[id]) {
      this._events.push({
          name : this._frames[id].name
        , cat  : this._name 
        , ph   : 'B'
        , pid  : this._pid
        , tid  : this._tid
        , ts   : timestamp 
        , args : {}
      })
      this._inside[id] = true;
    }
  }
}

proto._enterCurrentFunction = function _enterCurrentFunction(info, stackFrame, timestamp) {

    // Enter current function
    if (!this._inside[info.id]) {
        this._events.push({
          name : stackFrame.name
        , cat  : this._name
        , ph   : 'B'
        , pid  : this._pid
        , tid  : this._tid
        , ts   : timestamp 
        , args : {}
      })
      this._inside[info.id] = true;
    }

    // Define exit event of current function to be used when processing next function
    // @see: _maybeExitPrevousFunction
    this._previousFunctionExit = {
        name : stackFrame.name
      , cat  : this._name
      , ph   : 'E'
      , pid  : this._pid
      , tid  : this._tid
      , ts   : timestamp + (info.ticks * this._tickLen)
      , args : {}
    }

    this._previousFunctionId = info.id;
}

proto._exitAllRemainingFunctions = function _exitAllRemainingFunctions() {
  var insideKeys = Object.keys(this._inside), k;
  for (var j = 0; j < insideKeys.length; j++) {
    k = insideKeys[j];
    if (this._inside[k]) {
      this._events.push({
          name : this._frames[k].name
        , cat  : this._name 
        , ph   : 'E'
        , pid  : this._pid
        , tid  : this._tid
        , ts   : this._endTime 
        , args : {}
      })
    }
  }
}

proto._processInfos = function _processInfos() {
  var currentTick = 0;

  for (var i = 0; i < this._infos.length; i++) {
    var ts         = this._startTime + (this._tickLen * currentTick)
      , info       = this._infos[i]
      , stackFrame = this._frames[info.id]
      , j 

    this._addSample(info, ts);

    // Get IDs of all functions that are parents to this function
    var parentIds = getParentIds(this._frames, stackFrame);
    this._maybeExitPreviousFunction(parentIds);

    this._exitParentsNowOffStack(parentIds, info);
    
    this._enterParentsNewOnStack(parentIds, ts);

    this._enterCurrentFunction(info, stackFrame, ts);
    
    currentTick += info.ticks;
  }

  // Finally exit all functions we are still in after all is finished
  this._exitAllRemainingFunctions();

  return { samples: this._samples, events: this._events };
}
