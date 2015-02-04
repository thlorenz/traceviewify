'use strict';

var SampleMapper = require('./lib/sample-mapper')
  , StackFrameMapper = require('./lib/stackframe-mapper')

function safeString(s, alternative) {
  return (s && s.trim().length && s) || alternative;
}

function increaseIds(stackFrames) {
  // workaround:  https://github.com/google/trace-viewer/issues/734
  //              StackFrames with id=0 cause starburst errors
  var acc = {}, k, val;
  var keys = Object.keys(stackFrames);

  for (var i = keys.length -1; i >= 0; i--) {
    k = parseInt(keys[i]);
    val = stackFrames[k];
    // todo: not sure why parent is null instead of not present
    if (typeof val.parent !== 'undefined') val.parent++;
    stackFrames[k + 1] = val;
  }
  delete stackFrames[0];
  return stackFrames;
}

module.exports = 
  
/**
 * Converts given cpuprofile object to a trace viewer JSON object.
 * 
 * @name traceviewify
 * @function
 * @param {Object} cpuprofile as produced by Chrome DevTools or [cpuprofilify](https://github.com/thlorenz/cpuprofilify)
 * @param {Object=} opts 
 * @param {number} opts.pid  sets process id
 * @param {number} opts.tid  sets thread id
 * @param {number} opts.cpu  sets CPU number 
 * @return {Object} trace viewer JSON object
 */
function traceviewify(cpuprofile, opts) {
  opts = opts || {};
  var category = safeString(cpuprofile.title, 'CPU');

  var stackFrames = new StackFrameMapper(cpuprofile.head, category).map();
  var mapped = new SampleMapper(
      stackFrames
    , parseFloat(cpuprofile.startTime) * 1000000.0
    , parseFloat(cpuprofile.endTime) * 1000000.0
    , cpuprofile.samples
    , category 
    , opts.pid || 0 
    , opts.tid || 0 
    , opts.cpu || 0 
  ).map()


  return {
      traceEvents : mapped.events
    , stackFrames : increaseIds(stackFrames)
    , samples     : mapped.samples
  }
}
