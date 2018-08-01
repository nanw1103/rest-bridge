:begin
	node cluster-client.js requestInterval=1000 numRequests=100 clientParallel=2 clientVerbose
	ping localhost >nul
goto begin
