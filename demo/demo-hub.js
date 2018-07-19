const hub = require('../hub')

hub.registry.register({
	key: 'demoKey',
	description: 'demo connector'
})

hub.create({
	port: 80
})
