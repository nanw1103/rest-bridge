const instance = require('../shared/instance.js')

const mgmtSvc = require('./mgmt-svc.js')
const connectorSvc = require('./connector-svc.js')
const clientSvc = require('./client-svc.js')
const registry = require('./registry.js')

function init(app) {
	
	app.use('/rest-bridge/stat', function (req, res) {
		let info = {
			instance: instance.format(),
			client: clientSvc.stat,
			connector: connectorSvc.stat,
			mgmt: mgmtSvc.stat,
			registry: registry.stat,
			system: {
				memoryUsage: process.memoryUsage()
			}
		}
		let text = JSON.stringify(info)
		res.writeHead(200, { 'content-type': 'application/json' })
		res.end(text)
	})
}

module.exports = {
	init: init
}
