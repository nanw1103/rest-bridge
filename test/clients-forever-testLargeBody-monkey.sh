#!/bin/bash
COUNTER=0
while [ 1 ]; do
	node cluster-client.js numClients=5 monkey testLargeBody requestInterval=10 numConnectors=6
		
	echo The counter is $COUNTER
    let COUNTER=COUNTER+1
	sleep 3
done
