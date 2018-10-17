const { error } = require('../shared/log.js')()
const node = require('./node-impl.js')
const clusterCall = require('cluster-call')

clusterCall('master')
	.getOptions()
	.then(options => {
		options.port += Number.parseInt(process.env.RB_INDEX)
		return node.create(options)
	}).catch(e => {
		error(e)
		process.exit(1)
	})

