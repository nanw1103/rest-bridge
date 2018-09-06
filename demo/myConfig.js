module.exports = {
	
	//-------------------------------------------------------------------------------------
	//	Client interface, which handles requests from clients
	//-------------------------------------------------------------------------------------

	/*
		Port to accept client requests. If there are multiple worker nodes in
		this cluster, this port automatically increases on each node according 
		to node index. This is required by internal forwarding. 
		In real case, you may need a load balancer before the hub to expose
		a unified end point for clients.
	*/
	port: 80,			
	
	/*
		Host address for clients. By default bind to all interfaces
	*/
	//host: '0.0.0.0',	
		
	/*
		Base HTTP context path for APIs
	*/
	//baseContext: '/'
	
	
	//-------------------------------------------------------------------------------------
	//	Connector interface, which accepts connections from connectors.
	//	By default, connector interface is the same as client interface.
	//	In production case with security requirements, a different interface could be used.
	//	Different from client interface, the connector interface is always the same on all workers 
	//	in one NodeJs cluster.
	//-------------------------------------------------------------------------------------
	/*
		Port to accept connectors. If not specified, client port will be used.
	*/
	//connectorPort: 80,		

	/*
		Host address for connectors. By default bind to all interfaces. 
		If this is different from client host, the port must be different
	*/
	//connectorHost: '0.0.0.0',	
	
	//-------------------------------------------------------------------------------------
	//	Management interface configuration
	//	The management interface could be the same as client interface, and by default it is.
	//	In production case with security requirements, a different interface could be used.
	//	Different from client interface, the management interface is always the same on 
	//	all workers in one NodeJs cluster.
	//-------------------------------------------------------------------------------------
	
	/*
		Port for management. 
	*/
	//managementPort: 82,		

	/*
		Host for management. By default bind to all interfaces
		If this is different from client host, the port must be different
	*/
	//managementHost: '0.0.0.0',
	
	//-------------------------------------------------------------------------------------
	//	Cluster configuration
	//-------------------------------------------------------------------------------------
	/*
		How many worker nodes in this cluster. E.g. number of CPUs.
	*/
	//nodes: 1,
	
	/*
		Datastore for sharing state between rest-bridge clusters. 
		Change it only if you are setting up multiple rest-bridge clusters 
		in multiple machines/containers, e.g. for high availability.
		Use shared file store like: 'fs-store:/your/path/on/nfs', or create your own store.
		It is NOT necessary if you are setting up a single cluster with multiple nodes 
		on only one VM.
	*/
	//store: '',
	
	/*
		Whether allow unregistered connector to connect
	*/
	//allowUnregistered: false
	
	/*
		Custom function to validate client upon connection.
		Only valid in single node mode.
	*/
	//verifyClient: async (clientInfo, reqInfo) => true
	
	/*
		Whether allow unregistered connector to connect
	*/
	//responseHeaders: {'Access-Control-Allow-Origin': '*'}
}
