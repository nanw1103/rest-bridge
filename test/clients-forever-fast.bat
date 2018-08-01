:begin
	node cluster-client.js numClients=5 requestInterval=0
	ping localhost >nul
goto begin
