const hub = require('../hub')


hub.create({
	port: 80
})

hub.registry.register({
	key: 'demoKey',
	description: 'demo connector'
})
