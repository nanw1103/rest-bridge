:begin
	node cluster-client.js requestInterval=1000 numRequests=10 numClients=1 clientParallel=2 numHubNodes=1 numConnectors=1 clientVerbose
	ping localhost >nul
goto begin
