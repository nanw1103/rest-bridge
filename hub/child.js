const {log} = require('../shared/log.js')(__filename)
const node = require('./node-impl.js')

node.create({
	id: process.env.RB_NODE_ID,
	port: process.env.PORT,
	store: process.env.REST_BRIDGE_STORE,
})
