'use strict';

var SampleMapper = require('./lib/sample-mapper')
  , StackFrameMapper = require('./lib/stackframe-mapper')

function safeString(s, alternative) {
  return (s && s.trim().length && s) || alternative;
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
    , stackFrames : stackFrames
    , samples     : mapped.samples
  }
}
