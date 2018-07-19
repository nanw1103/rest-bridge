const rbconnector = require('../connector')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

rbconnector.start({
	
	hub: 'ws://localhost',
	
	info: {
		key: 'demoKey',
		id: 'demoConnector'
	},
	
	routes: {		
		
		/*
		'/demo': {
			target: 'http://localhost:8081'			
		},
		'/products': 'https://www.vmware.com',
		*/
		
		'.*': 'https://www.vmware.com'
	}		
})
