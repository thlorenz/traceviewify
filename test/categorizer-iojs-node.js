'use strict';

var test = require('tape')
  , cat = require('../lib/categorizer-iojs-node')

test('\nwhen asked if it can categorize', function (t) {
  t.ok(cat.canCategorize('iojs'), 'can categorize iojs')
  t.ok(cat.canCategorize('node'), 'can categorize node')
  t.ok(!cat.canCategorize('other'), 'cannot categorize other')
  t.end()
})

test('\nwhen asked to categorize', function (t) {
  var tuples = [ 
    [ 'uv__io_poll', 'libuv' ] 
  , [ 'libsystem_malloc.dylib`szone_malloc', 'system' ] 
  , [ 'libc++abi.dylib`operator new(unsigned long)', 'system' ] 
  , [ 'node::AsyncWrap::MakeCallback(v8::Handle<v8::Function>, int, v8::Handle<v8::Value>*)', 'node' ] 
  , [ 'start', 'node' ]
  , [ 'v8::internal::Heap::Scavenge()', 'v8' ] 
  , [ 'http_parser_execute', 'http_parser' ] 
  , [ '~Readable.push _stream_readable', 'JavaScript' ] 
  , [ '*toFib', 'JavaScript' ] 
  ]

  var categorizer = cat([ 'iojs' ]);

  function check(tpl) {
    t.equal(categorizer.categorize(tpl[0]), tpl[1], 'identifies category ' + tpl[1] + ' for ' + tpl[0]);
  }

  tuples.forEach(check);
  t.equal(categorizer.categorize('anyname', 'module.js'), 'JavaScript', 'correctly identifies JavaScript files by extension');
  t.end()
})
