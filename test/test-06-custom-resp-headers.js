const fvt = require('./fvt.js')
const rbcall = require('../shared/rbcall.js')
const hubConfig = require('./defaultHubConfig.js')
const connectorConfig = require('./defaultConnectorConfig.js')

hubConfig.auth.responseHeaders = {
	'Access-Control-Allow-Origin': '*',
	'x-test-custom': 'ice wind dale'
}

fvt(hubConfig, connectorConfig, async () => {
	let ret = await rbcall('http://localhost/hello', 'demoKey')

	//console.log(ret.headers)

	return ret.headers['access-control-allow-origin'] === '*'
		&& ret.headers['x-test-custom'] === 'ice wind dale'
})
