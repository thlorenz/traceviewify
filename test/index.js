'use strict';
/*jshint asi: true */

var test = require('tape');
var fs = require('fs');
var traceviewify = require('..');

/*
 * Right now very brittle integration test which breaks due to smallest change.
 * If so regenerated converted JSON, check results carefully (by loading into chrome://tracing)
 * and then overwrited expected results
 */

test('\nconverting a large cpuprofile with default options', function (t) {
  var cpuprofile = require('./fixtures/fibonacci.cpuprofile')
    , expected = require('./fixtures/traceview.json')

  var res = traceviewify(cpuprofile);
  // fs.writeFileSync(__dirname + '/fixtures/traceview.json', JSON.stringify(res, null, 2), 'utf8');
  
  t.deepEqual(res, expected, 'converts it to trace object format exactly as expected')
  t.end()
})


