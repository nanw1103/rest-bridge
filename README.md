# rest-bridge
Expose REST service in private network to public network, via connector (in private network) and hub (public service).

![rest-bridge architecture](https://github.com/nanw1103/rest-bridge/blob/master/docs/rest-bridge-overview.png)

# Example - Hub

```javascript
const hub = require('rest-bridge/hub')

let options = {
	
	port: 80,	//Port to accept client requests. If there are multiple worker nodes in
			//this cluster, this port automatically increases on each node according 
			//to node index. This is required by internal forwarding. In real case, 
			//you may want to have a load balancer on top of it so as to provide a 
			//unique end point for connectors and clients.

	//nodes: 1,	//How many worker nodes in this cluster. E.g. number of CPUs.
	
	//store: '',	//Datastore for sharing state between rest-bridge clusters. 
			//Change it only if you are setting up multiple rest-bridge clusters 
			//in multiple machines/containers, e.g. for high availability.
			//Use shared file store like: 'fs-store:/your/path/on/nfs', or create your own store.
			//It is NOT necessary if you are setting up a single cluster with multiple nodes 
			//on only one VM.
}

hub.create(config).then(() => {	
	//demo purpose
	hub.registry.register({
		key: 'demoKey',
		description: 'demo connector'
	})
}).catch(console.error)

```

# Example - Connector

```javascript

const rbconnector = require('rest-bridge/connector')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

rbconnector.start({
	
	hub: 'ws://localhost',	//which hub to connect to
	
	info: {				//information of this connector
		key: 'demoKey',		//the pairing key
		id: 'demoConnector'
	},
	
	target: 'http://localhost:10762',	//the target http service
	
	//additionally, path based routing an be specified using a map,
	//regular expression for request path as key, and target as value.
	//Example:
	/*
	routes: {		
		'/demo': {
			target: 'http://localhost:8081'			
		},
		'/products': 'https://www.vmware.com',
		'.*': 'https://www.vmware.com'
	}
	*/
})

```

# Example - rest-bridge client

```javascript
const http = require('http')

//To do a rest-bridge call, a pairing key must be specified, so as to distinguish 
//which connector to use. The pairing key can be specified either in request 
//header, or request path.

//Method 1 - Specify pairing key in header
let options = {
	host: 'localhost',
	path: '/hello',
	headers: {
		'x-rest-bridge-key': 'demoKey'	//specify which connector we are using
	}
}
http.get(options, resp => {
	let body = ''
	resp.setEncoding('utf8')
		.on('data', chunk => body += chunk)
		.on('end', () => console.log(body))
}).on('error', console.error)
.end()
	
//Method 2 - Specify pairing key in request path.
//This method requires a fixed base path to be added
//http.get('http://localhost/rest-bridge-forward/<pairingKey>/hello')


```

# Configuration Details
https://github.com/nanw1103/rest-bridge/blob/master/demo/myConfig.js

# Management Interface

http://<hub_host>:<management_port>/rest-bridge
```json
[
    {
        "name": "register",
        "method": "post",
        "path": "/registry",
        "description": "Register a new connector",
        "href": "http://localhost/rest-bridge/registry"
    },
    {
        "name": "Delete registered connector",
        "method": "delete",
        "path": "/registry/<key>",
        "description": "Remove a connector",
        "href": "http://localhost/rest-bridge/registry/<key>"
    },
    {
        "name": "registry",
        "method": "get",
        "path": "/registry",
        "description": "Get registry information",
        "href": "http://localhost/rest-bridge/registry"
    },
    {
        "name": "registry.connector",
        "method": "get",
        "path": "/registry/<connector-key>",
        "description": "Get information of specific connector",
        "href": "http://localhost/rest-bridge/registry/<connector-key>"
    },
    {
        "name": "nodes",
        "method": "get",
        "path": "/nodes",
        "description": "Get nodes in this cluster instance",
        "href": "http://localhost/rest-bridge/nodes"
    },
    {
        "name": "connectors",
        "method": "get",
        "path": "/connectors",
        "description": "Get connector information. Scope: cluster instance",
        "href": "http://localhost/rest-bridge/connectors"
    },
    {
        "name": "stat",
        "method": "get",
        "path": "/stat",
        "description": "Get statistics. Scope: cluster instance",
        "href": "http://localhost/rest-bridge/stat"
    },
    {
        "name": "env",
        "method": "get",
        "path": "/env",
        "description": "Get environments. Scope: cluster instance",
        "href": "http://localhost/rest-bridge/env"
    },
    {
        "name": "node",
        "method": "get",
        "path": "/node",
        "description": "Get single node info",
        "href": "http://localhost/rest-bridge/node"
    }
]
```

# High Availability
Create each hub instance as a cluster, using a shared store:

```javascript
let hubOptions = {
	port: 80,
	nodes: require('os').cpus().length,
	store: 'fs-store:/efs/rest-bridge-repo'
}
```

And then create multiple clusters with load balancers, e.g. AWS Elasticbeanstalk + EFS or ElasticCache
 
Requests will be forwarded internally between the nodes on demand. So clients or connectors only care about connecting to a single service point.

![rest-bridge architecture](https://github.com/nanw1103/rest-bridge/blob/master/docs/rest-bridge-HA.png)

# Security
Method 1: In hub options, specify different network interface for management endpoint, client endpoint, and connector endpoint. Use firewall/security group/api gateway to control the access

Method 2: Control context based access on api gateway/proxy/nginx, etc.


