const nwlog = require('./log.js')

let index = Number.parseInt(process.env.rb_node_id || 0)
let name = require('cluster').isMaster ? 'MASTER' : index

const inst = {
	version: getPackageVersion(),
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

function getPackageVersion() {
	try {
		let packageJson = require('../package.json')
		return packageJson.version
	} catch (e) {
		console.error(e)
		return e.toString()
	}
}

nwlog.config({
	custom: () => inst.short()
})

module.exports = inst