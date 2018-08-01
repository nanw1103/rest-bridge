:begin
	node cluster-client.js numClients=5 clientParallel=2 testLargeBody monkey
	ping localhost >nul
goto begin