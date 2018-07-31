const { error } = require('../shared/log.js')(__filename)
const node = require('./node-impl.js')
const clusterCall = require('cluster-call')

clusterCall('master')
	.getOptions()
	.then(options => {
		options.port += Number.parseInt(process.env.RB_INDEX)
		return options
	}).then(options => node.create(options))
	.catch(e => {
		error(e)
		process.exit(1)
	})

