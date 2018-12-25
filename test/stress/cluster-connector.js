const launchCluster = require('./launch-cluster.js')
const config = require('./config.js')

function start() {
	console.log('! Launching connector cluster')

	return launchCluster('one-connector.js', config.numConnectors)
}

module.exports.start = start

if (require.main === module) {
	start()
		.then(result => {
			console.log('Exited with', result)
			process.exit(result)
		})
		.catch(err => {
			console.error('Exited with error', err)
			process.exit(23456)
		})
}