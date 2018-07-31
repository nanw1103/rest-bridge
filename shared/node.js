
//----------------------------------------------------------------------
//	Explicitly log unhandled errors
//----------------------------------------------------------------------
process.on('uncaughtException', err => {
	console.error('uncaughtException', err)
	process.exit(11)
})

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
	process.exit(12)
})

let index = Number.parseInt(process.env.rb_node_id || 0)
let name = require('cluster').isMaster ? 'MASTER' : index

const inst = {
	version: 115,
	startTime: Date.now(),
	id: Math.random().toString(36).slice(2).padEnd(12, '0'),
	pid: process.pid,
	index: index,
	name: name
}

Object.defineProperties(inst, {
	format: {
		value: function() {
			inst.upTime = Date.now() - inst.startTime
			return Object.assign({}, inst)
		}
	},
	short: {
		value: function() {	
			return inst.id + '/' + String(inst.name).padEnd(6, ' ')
		}
	}
})

module.exports = inst