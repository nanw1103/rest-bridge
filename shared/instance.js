const startTime = Date.now()
const id = Math.random().toString(36).slice(2)

const VERSION = 1

function format() {
	return {
		id: id,
		version: VERSION,
		pid: process.pid,		
		upTime: Date.now() - startTime
	}
}

console.log('Instance', format())

module.exports = {
	startTime: startTime,
	id: id,
	
	format: format
}