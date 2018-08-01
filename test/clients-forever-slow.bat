:begin
	node cluster-client.js numClients=10 requestInterval=5000 numRequests=100 
	ping localhost >nul
goto begin
