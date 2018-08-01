'use strict'

const {log} = require('../shared/log.js')(__filename)
const delay = millis => new Promise(resolve => setTimeout(resolve, millis))

const clusterTarget = require('./cluster-target.js')
const clusterConnector = require('./cluster-connector.js')
const clusterClient = require('./cluster-client.js')

function createHub() {
	const fork = require('child_process').fork
	return fork(__dirname + '/hub.js')
}

async function createTestMasterImpl() {
	//targets
	clusterTarget.start()

	//hub
	createHub()
	await delay(2000)
	
	//connectors
	clusterConnector.start()
	await delay(2000)
	
	return await clusterClient.start()
}
createTestMasterImpl().then(() => {
	log('SUCCESS')	
	process.exit(0)
}).catch(e => {
	log('FAILED:', e)
	process.exit(1)
})