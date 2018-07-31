const hub = require('../hub')

const config = require('./myConfig.js')

hub.create(config).then(() => {	
	//demo purpose
	hub.registry.register({
		key: 'demoKey',
		description: 'demo connector'
	})
}).catch(console.error)


