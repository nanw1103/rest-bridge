const fvt = require('./fvt.js')
const rbcall = require('../shared/rbcall.js')
const {log, error} = require('../shared/log.js')()

const basicCases = require('./basic-cases.js')()
const hubConfig = require('./defaultHubConfig.js')
const connectorConfig = require('./defaultConnectorConfig.js')
fvt(hubConfig, connectorConfig, basicCases)