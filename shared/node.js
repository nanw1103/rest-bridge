
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

const inst = {
	version: 102,
	startTime: Date.now(),
	id: Math.random().toString(36).slice(2).padEnd(12, '0'),
	pid: process.pid
}

function format() {
	inst.upTime = Date.now() - inst.startTime
	return Object.assign({}, inst)
}

function short() {
	let port
	if (inst.port)
		port = String(inst.port).padEnd(6, ' ')
	else
		port = 'MASTER'
	
	return inst.id + '/' + port
}

Object.defineProperties(inst, {
	format: {
		value: format
	},
	short: {
		value: short
	}
})

module.exports = inst