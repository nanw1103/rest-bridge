const fvt = require('./fvt.js')
const rbcall = require('../shared/rbcall.js')
const {log, error} = require('../shared/log.js')()

const basicCases = require('./basic-cases.js')('http://localhost:81/custom/path')
const hubConfig = require('./defaultHubConfig.js')
const connectorConfig = require('./defaultConnectorConfig.js')

hubConfig.baseContext = '/custom/path'
connectorConfig.hub = 'ws://localhost:81/custom/path',

fvt(hubConfig, connectorConfig, basicCases)
