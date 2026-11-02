#!/bin/bash
# Restart the HMR-free QA dev server (port 5175) and the persistent Playwright QA session.
S=${SCRATCH:-/tmp/qa}; mkdir -p $S
for f in $S/qa_vite.pid $S/qa_tune.pid; do [ -f $f ] && kill -- -$(cat $f) 2>/dev/null; done
fuser -k 5175/tcp 2>/dev/null
sleep 1
NO_HMR=1 setsid npx vite --port 5175 > $S/vite_qa.log 2>&1 & echo $! > $S/qa_vite.pid
sleep 3
: > $S/tune.in; : > $S/tune.out
TUNE_IN=$S/tune.in TUNE_OUT=$S/tune.out W=${W:-960} H=${H:-540} Q=${Q:-high} setsid node tests/tune.mjs > $S/tune.log 2>&1 & echo $! > $S/qa_tune.pid
echo restarted
