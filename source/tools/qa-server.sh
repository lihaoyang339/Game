#!/bin/bash
# (Re)start the HMR-free QA dev server on port 5175 (file watching is off, so restart after every edit).
S=${SCRATCH:-/tmp/qa}; mkdir -p $S
[ -f $S/qa_vite.pid ] && kill -- -$(cat $S/qa_vite.pid) 2>/dev/null; fuser -k 5175/tcp 2>/dev/null; sleep 1
NO_HMR=1 setsid npx vite --port 5175 > $S/vite_qa.log 2>&1 & echo $! > $S/qa_vite.pid
for i in $(seq 1 30); do curl -s localhost:5175/ >/dev/null && break; sleep 0.5; done; echo "qa server up"
