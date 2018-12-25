const cluster = require('cluster')
module.exports = cluster.isMaster ?
	require('./cluster-mem-store-master.js') : require('./cluster-mem-store-child.js')
