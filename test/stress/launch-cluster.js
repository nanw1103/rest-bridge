const cluster = require('cluster')
const { log } = require('../../shared/log.js')()
const config = require('./config.js')

function startWorker(id, onExit) {
	log('start worker', id)
	let w = cluster.fork({
		rb_node_id: id
	})
	
	w.on('exit', (code, signal) => {
		let msg = `worker ${id} exited: ${code}`
		if (signal)
			msg += ', signal=' + signal
		log(msg)
		
		if (config.monkey)
			setTimeout(() => startWorker(id), 3000)
		else if (onExit)
			onExit(id, code)
	})
}

function monkey() {
	//console.log(cluster.workers)
	let keys = Object.keys(cluster.workers)
	let a = Math.floor(Math.random() * keys.length)
	let b = Math.floor(Math.random() * keys.length)
	let w1 = cluster.workers[keys[a]]
	let w2 = cluster.workers[keys[b]]
	
	log('monkey', a, b)
	try {
		if (w1)
			w1.kill()
	} catch (e) {
		log(e)
	}
	
	try {
		if (w2)
			w2.kill()
	} catch (e) {
		log(e)
	}
	
	let next = (15 + Math.random() * 5) * 1000
	setTimeout(monkey, next)
}

function start(module, numNodes) {
	
	log('launch-cluster', module)
	cluster.setupMaster({ exec: __dirname + '/' + module })
	

	let exitCodes = new Array(numNodes)
	for (let i = 0; i < numNodes; i++)
		exitCodes[i] = undefined
	
	let onExit
	let ret = new Promise((resolve, reject) => {
		onExit = function(id, code) {			
			exitCodes[id] = code
			
			let anyError
			for (let i = 0; i < exitCodes.length; i++) {
				let c = exitCodes[i]
				if (c === undefined)
					return
				if (c !== 0)
					anyError = c
			}
			if (anyError)
				reject(anyError)
			else
				resolve()
		}
	})
	
	for (let i = 0; i < numNodes; i++)
		startWorker(config.fromIndex + i, onExit)
	
	if (config.monkey)
		setTimeout(monkey, 10000)
	
	return ret
}

module.exports = start