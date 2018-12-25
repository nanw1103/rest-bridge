const fvt = require('./fvt.js')

const basicCases = require('./basic-cases.js')('http://localhost:80')
const hubConfig = require('./defaultHubConfig.js')
const connectorConfig = require('./defaultConnectorConfig.js')

hubConfig.cluster.nodes = 1

fvt(hubConfig, connectorConfig, basicCases)
