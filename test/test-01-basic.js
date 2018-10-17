const fvt = require('./fvt.js')
const rbcall = require('../shared/rbcall.js')
const {log, error} = require('../shared/log.js')()

const basicCases = require('./basic-cases.js')('http://localhost:80')
const hubConfig = require('./defaultHubConfig.js')
const connectorConfig = require('./defaultConnectorConfig.js')

hubConfig.cluster.nodes = 1

fvt(hubConfig, connectorConfig, basicCases)
