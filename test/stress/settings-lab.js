module.exports = {
	//target config
	numTargets: 3,

	//hub config
	numHubNodes: 3,
	store: null,	//'fs-store:/rest-bridge-test',

	//connector config
	hub: 'ws://localhost:10763',
	target: 'http://localhost:10762',
	numConnectors: 3,

	//client config
	numClients: 5,
	numRequests: 10000,
	testLargeBody: false,
	requestInterval: 10,
	clientVerbose: false,
	clientParallel : 10,

	//common args for cluster
	fromIndex: 0,
	monkey: false
}
