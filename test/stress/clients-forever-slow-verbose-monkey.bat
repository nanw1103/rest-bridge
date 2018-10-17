:begin
	node cluster-client.js requestInterval=1000 numRequests=100 numClients=5 clientParallel=2 clientVerbose monkey
	ping localhost >nul
goto begin
