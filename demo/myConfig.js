module.exports = {
	
	//-------------------------------------------------------------------------------------
	//	Client interface, which handles requests from clients
	//-------------------------------------------------------------------------------------
	port: 80,				//Port to accept client requests. If there are multiple worker nodes in
								//this cluster, this port automatically increases on each node according 
								//to node index. This is required by internal forwarding. 
								//In real case, you may need a load balancer before the hub to expose
								//a unified end point for clients.
	//host: '0.0.0.0',	//Host address for clients. By default bind to all interfaces
	
	//-------------------------------------------------------------------------------------
	//	Connector interface, which accepts connections from connectors.
	//	By default, connector interface is the same as client interface.
	//	In production case with security requirements, a different interface could be used.
	//	Different from client interface, the connector interface is always the same on all workers 
	//	in one NodeJs cluster.
	//-------------------------------------------------------------------------------------
	//connectorPort: 80,		//Port to accept connectors. If not specified, client port will be used.
	//connectorHost: '0.0.0.0',	//Host address for connectors. By default bind to all interfaces. 
								//If this is different from client host, the port must be different
	
	//-------------------------------------------------------------------------------------
	//	Management interface configuration
	//	The management interface could be the same as client interface, and by default it is.
	//	In production case with security requirements, a different interface could be used.
	//	Different from client interface, the management interface is always the same on 
	//	all workers in one NodeJs cluster.
	//-------------------------------------------------------------------------------------
	//managementPort: 82,		//Port for management. 
	//managementHost: '0.0.0.0',//Host for management. By default bind to all interfaces
								//If this is different from client host, the port must be different
	
	//-------------------------------------------------------------------------------------
	//	Cluster configuration
	//-------------------------------------------------------------------------------------
	//nodes: 1,					//How many worker nodes in this cluster. E.g. number of CPUs.
	
	//store: '',				//Datastore for sharing state between rest-bridge clusters. 
								//Change it only if you are setting up multiple rest-bridge clusters 
								//in multiple machines/containers, e.g. for high availability.
								//Use shared file store like: 'fs-store:/your/path/on/nfs', or create your own store.
								//It is NOT necessary if you are setting up a single cluster with multiple nodes 
								//on only one VM.
}
