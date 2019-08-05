const hub = require('../hub')

const config = require('./myConfig.js')

config.enableMgmtSvc = false
config.enableStatSvc = false

hub.create(config).then(() => {
	//demo purpose
	hub.registry.register({
		key: 'demoKey',
		description: 'demo connector'
	})
}).catch(console.error)
