'use strict'
const rbconnector = require('../connector')
const thisNode = require('../shared/node.js')
const config = require('./config.js')

let port = config.hubPort + thisNode.index % config.numHubNodes

let hubUrl = `http://${config.hubHost}:${port}`

rbconnector.start({	
	hub: hubUrl,
	info: {
		key: 'demoKey-' + thisNode.index,
		id: 'demoConnector-' + thisNode.index
	},
	target: config.target,
	
	//additional pattern based routes can be specified as:
	/*
	routes: {
		'.*': 'http://localhost:10762'
	}
	*/
})