module.exports = {
	//target config
	numTargets: 10,
	
	//hub config
	numHubNodes: 1,	//AWS has a load balancer, so a unique connection point. Though it IS a cluster with multiple nodes, we must specify 1 here for the test to work.
	store: null,	//'fs-store:/rest-bridge-test',
	
	//connector config
	hub: 'ws://rb66.us-west-1.elasticbeanstalk.com:80',
	target: 'http://localhost:10762',
	numConnectors: 10,
	connectorVerbose: false,
	
	//client config
	numClients: 5,
	numRequests: 10000,
	testLargeBody: false,
	requestInterval: 1000,
	clientVerbose: false,
	clientParallel : 10,
	
	//common args for cluster
	fromIndex: 0,
	monkey: false
}
