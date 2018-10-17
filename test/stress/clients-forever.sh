#!/bin/bash
COUNTER=0
while [ 1 ]; do
	node cluster-client.js numClients=5 numConnectors=6
	if [ $? -ne 0 ]; then
		echo 'FAILED.'
		#read -p 'Press ENTER to continue...'
	fi
	
	echo The counter is $COUNTER
    let COUNTER=COUNTER+1
	sleep 3
done
