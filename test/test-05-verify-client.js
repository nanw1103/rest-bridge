const fvt = require('./fvt.js')
const rbcall = require('../shared/rbcall.js')
const {log, error} = require('../shared/log.js')()

const k = 'ophilia'

const basicCases = require('./basic-cases.js')('http://localhost', k)
const hubConfig = require('./defaultHubConfig.js')
const connectorConfig = require('./defaultConnectorConfig.js')

hubConfig.cluster.nodes = 1
hubConfig.auth.allowUnregistered = true
connectorConfig.info.key = k

hubConfig.auth.verifyClient = async (clientInfo /*, info*/) => {
	log('verifyClient', clientInfo)
	let ok = clientInfo.key === k
	return ok
}

fvt(hubConfig, connectorConfig, basicCases)

//TODO: add auth failure verification case