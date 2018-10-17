const fvt = require('./fvt.js')
const rbcall = require('../shared/rbcall.js')
const {log, error} = require('../shared/log.js')()

const basicCases = require('./basic-cases.js')(null, 'anyKey')
const hubConfig = require('./defaultHubConfig.js')
const connectorConfig = require('./defaultConnectorConfig.js')

hubConfig.auth.allowUnregistered = true
connectorConfig.info.key = 'anyKey'

fvt(hubConfig, connectorConfig, basicCases)