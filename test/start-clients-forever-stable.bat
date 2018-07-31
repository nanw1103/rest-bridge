:begin
	node cluster-client.js numClients=5 hubHost=10.112.117.121 requestInterval=10 numConnectors=6
	ping localhost >nul
goto begin
