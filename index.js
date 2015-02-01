'use strict';

function nodeName(node) {
  var n = node.functionName;
  if (node.url) n += ' ' + node.url + ':' + node.lineNumber;
  return n;
}

function addFrame(frames, category, node, parent) {
  frames[node.id] = { category: category, name: nodeName(node), parent: parent };

  for (var i = 0; i < node.children.length; i++) 
    addFrame(frames, category, node.children[i], node.id);
}

function getParentIds(frames, node) {
  var acc = [], id;
  while(node.parent) {
    id = node.parent;
    node = frames[id];
    acc.push(id);
  }
  return acc;
}

var inside = {};

function mapSamples(frames, startTime, endTime, samples, name, pid, tid, cpu) {
  var samplesLen = samples.length
    , infos      = [] 
    , events     = []
    , prevId     = -1
    , prevInfo   = null
    , i


  // Consolidate cases in which the same script ID appears in a row
  // In that case we'll increase it's ticks count
  for (i = 0; i < samplesLen; i++) {
    if (samples[i] === prevId) {
      prevInfo.ticks++;
    } else {
      prevId = samples[i];
      prevInfo = { id: prevId, ticks: 1 };
      infos.push(prevInfo);
    }
  }

  var samps  = [] 
    , tickLen = (endTime - startTime) / samplesLen
    , currentTick = 0
    , previousFunctionExit
    , previousFunctionId;

  for (i = 0; i < infos.length; i++) {
    var ts         = startTime + (tickLen * currentTick)
      , info       = infos[i]
      , stackFrame = frames[info.id]
      , j 

    samps.push({
        name   : name
      , weight : info.ticks * tickLen
      , ts     : ts 
      , sf     : infos.id
      , tid    : tid
      , cpu    : cpu
    })

    // Get IDs of all functions that are parents to this function
    var parentIds = getParentIds(frames, stackFrame);
    
    // Only if the previous leaf function is not part of the parents now did we exit it
    if (previousFunctionExit && !~parentIds.indexOf(previousFunctionId)) {
      events.push(previousFunctionExit)
      inside[previousFunctionId] = false;
    }

    if (info.id === 17) {
      inspect(info)
      inspect(parentIds)
    }

    // Some functions were part of the stack of the previous function, but aren't part 
    // of the stack of the current one.
    // Therefore we need to emit exit events for them.
    var insideKeys = Object.keys(inside), id, k
    for (j = 0; j < insideKeys.length; j++) {
      k = insideKeys[j];
      id = parseInt(k);
      if (inside[k] && id !== info.id && k !== previousFunctionId && !~parentIds.indexOf(id)) {
        events.push({
            name : frames[k].name
          , cat  : name 
          , ph   : 'E'
          , pid  : pid
          , tid  : tid
          , ts   : previousFunctionExit.ts
          , args : {}
        })

        inside[k] = false;
      }
    }

    // We might have entered parent functions that called the current function
    // Ensure to raise an event that they have been entered
    for (j = parentIds.length - 1; j >= 0; j--) {
      id = parentIds[j];
      if (!inside[id]) {
        events.push({
            name : frames[id].name
          , cat  : name 
          , ph   : 'B'
          , pid  : pid
          , tid  : tid
          , ts   : ts
          , args : {}
        })
        inside[id] = true;
      }
    }

    // Enter current function
    if (!inside[info.id]) {
        events.push({
          name : stackFrame.name
        , cat  : name
        , ph   : 'B'
        , pid  : pid
        , tid  : tid
        , ts   : ts
        , args : {}
      })
      inside[info.id] = true;
    }

    // Exit current function
    previousFunctionExit = {
        name : stackFrame.name
      , cat  : name
      , ph   : 'E'
      , pid  : pid
      , tid  : tid
      , ts   : ts + (info.ticks * tickLen)
      , args : {}
    }
    previousFunctionId = info.id;
    
    currentTick += info.ticks;
  }

  // Finally exit all functions we are still in after all is finished
  Object.keys(inside).forEach(function (k) {
    if (inside[k]) {
      events.push({
          name : frames[k].name
        , cat  : name 
        , ph   : 'E'
        , pid  : pid
        , tid  : tid
        , ts   : endTime 
        , args : {}
      })

      inside[k] = false;
    }
  })

  return { samples: samps, events: events };
}


function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

var fs = require('fs');

var cpuprofileJSON = fs.readFileSync(require.resolve('./test/fixtures/fibonacci.cpuprofile'), 'utf8');
var cpuprofile = JSON.parse(cpuprofileJSON);
var category = 'iojs';
var root = cpuprofile.head;
var stackFrames = { };

addFrame(stackFrames, category, root)

var mapped = mapSamples(
    stackFrames
  , parseFloat(cpuprofile.startTime) * 1000000.0
  , parseFloat(cpuprofile.endTime) * 1000000.0
  , cpuprofile.samples
  , 'iojs'
  , 2
  , 1
  , 0);

var res = {
    traceEvents : mapped.events
  , stackFrames : stackFrames
  , samples     : mapped.samples
}

fs.writeFileSync('/tmp/traceview.json', JSON.stringify(res, null, 2), 'utf8');
