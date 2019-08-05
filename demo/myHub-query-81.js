const hub = require('../hub')
const config = require('./myConfig.js')

config.port = 81

hub.create(config).then(() => {
	hub.registry.useNodeQuery([
		'http://localhost:80',
		'http://localhost:81',
	])

	//demo purpose
	hub.registry.register({
		key: 'demoKey',
		description: 'demo connector'
	})
}).catch(console.error)
