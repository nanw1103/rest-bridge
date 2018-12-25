const hub = require('../hub')
const config = require('./myConfig.js')

hub.create(config).then(() => {
	hub.registry.useNodeQuery([
		'localhost:80',
		'localhost:81',
	])

	//demo purpose
	hub.registry.register({
		key: 'demoKey',
		description: 'demo connector'
	})
}).catch(console.error)


