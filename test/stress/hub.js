'use strict'
const hub = require('../../hub')
const config = require('./config.js')

const options = {
	cluster: {
		nodes: config.numHubNodes
	},
	port: config.hubPort
}
if (config.store)
	options.cluster.store = config.cluster

hub.create(options)
	.then(() => {
		for (let i = 0; i < config.numConnectors; i++)
			hub.registry.register({key: 'demoKey-' + i})
		console.log('Dev - registered connectors:', config.numConnectors)
	})
	.catch(console.error)