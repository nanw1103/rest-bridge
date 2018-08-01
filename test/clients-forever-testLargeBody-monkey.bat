:begin
	node cluster-client.js numClients=5 testLargeBody monkey
	ping localhost >nul
goto begin