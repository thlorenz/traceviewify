#!/usr/sbin/dtrace -s

/*
 * Generates [JSON Array Format](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/edit#heading=h.f2f0yd51wi15)
 * tracing data that can be directly loaded into chrome://tracing to visualize execution.
 *
 * Pipe result through the below to remove internals:
 *  egrep -v '__libc_start|node::Start\(|v8::internal::|Builtin:|Stub:|LoadIC:|LoadPolymorphicIC:)'
 */

#pragma D option quiet

BEGIN {
  printf("[");
  comma="";
}

pid$target:::entry {
  printf("%s\n  { \"cat\": \"%s\", \"pid\": %d, \"tid\": %d, \"ts\": %d, \"ph\": \"B\", \"name\": \"%s\" }",
            comma, execname, pid, tid, timestamp / 1000000, probefunc);
  comma=",";
}

pid$target:::return {
  printf("%s\n  { \"cat\": \"%s\", \"pid\": %d, \"tid\": %d, \"ts\": %d, \"ph\": \"E\", \"name\": \"%s\" }",
            comma, execname, pid, tid, timestamp / 1000000, probefunc);
  comma=",";
}

END {
  printf("]");
}
