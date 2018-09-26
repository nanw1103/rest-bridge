const rbconnector = require('../connector')

//process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

rbconnector.start({
	
	hub: 'ws://localhost',	//which hub to connect to
	
	info: {					//information of this connector
		key: 'demoKey',		//the pairing key
		id: 'demoConnector'
	},
	
	target: 'http://localhost:10762'
	
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
	},
	*/
	
	/*
		Specifies websocket heartbeat interval, in milliseconds.
		Used to keep connection alive. 
		For example, some proxy appliances (e.g. Nginx) in the route
		may have a small keep-alive interval, which could interrupt the connection.
		Setting an interval less than that will do keep the connection alive.
		If you increase this value, DO also increase it on rest-bridge hub side. Otherwise
		the hub will treat the connector as idle and actively close the connection.
	*/
	//heartbeatInterval: 60000
})
