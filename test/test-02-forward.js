const fvt = require('./fvt.js')

const basicCases = require('./basic-cases.js')()
const hubConfig = require('./defaultHubConfig.js')
const connectorConfig = require('./defaultConnectorConfig.js')
fvt(hubConfig, connectorConfig, basicCases)