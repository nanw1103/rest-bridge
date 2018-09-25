'use strict'
const http = require('http')
const {log, error} = require('../shared/log.js')(__filename)
const config = require('./config.js')
const rbheaders = require('../shared/constants.js').headers
const delay = millis => millis > 0 ? new Promise(resolve => setTimeout(resolve, millis)) : 0
const rbcall = require('../shared/rbcall.js')

let processed = 0
function test1(n) {
	if (++processed % 2000 === 0) {
		let percent = (processed * 100 / config.numRequests) | 0
		log(`Processed ${processed}, ${percent}%...`)
	}
	
	if (n === 0)
		return test404(n)
	
	let connectorId = Math.floor(Math.random() * config.numConnectors)
	let hubPort = config.hubPort + Math.floor(Math.random() * config.numHubNodes)
	
	let options = {
		method: 'POST',
		hostname: config.hubHost,
		port: hubPort,
		path: `/test/${n}`,
		headers: {}
	}
	options.headers[rbheaders.KEY] = 'demoKey-' + connectorId
	
	if (config.clientVerbose)
		options.headers[rbheaders.REQ_HUB_INFO] = true
	
	let bodyLength
	if (config.testLargeBody) {
		let maxLen = 1024 * 1024
		bodyLength = Math.floor(Math.random() * maxLen)
		
		options.headers['content-type'] = 'text/plain'
		options.headers['content-length'] = bodyLength
	}	

	let reqStartTime
	if (config.clientVerbose) {
		reqStartTime = Date.now()
		log(`#${n} C-${connectorId} -->`)
	}
		
	//log('http://' + options.hostname + ':' + options.port + options.path, options)
	let hubInfo
	return new Promise((resolve, reject) => {
		//http.get(`http://localhost:10763/rest-bridge-forward/demoKey-${connectorId}/test/${n}`, resp => {
		let req = http.request(options, resp => {
			
			hubInfo = resp.headers[rbheaders.HUB_INFO]
			
			let ret = resp.headers['x-ret']
			let success = ret === String(n)
			if (!success)
				return reject(`${resp.statusCode}: ${resp.statusMessage}`)
			
			if (!config.testLargeBody)
				return resolve()

			let body = ''
			resp.setEncoding('utf8')				
				.on('data', chunk => body += chunk)
				.on('end', () => {
					let result = Number.parseInt(body)
					if (result === bodyLength)
						resolve()
					else
						reject(`Body length error: sent=${bodyLength}, server=${result}`)
				})
		}).on('error', err => {
			reject(err)
		})
		
		if (config.testLargeBody) {
			let body = ''.padEnd(bodyLength, '.')
			req.write(body)
		}
		
		req.end()
	}).then(() => {
		if (config.clientVerbose) {
			let cost = String(Date.now()-reqStartTime).padEnd(4)
			log(`#${n} C-${connectorId} <-- [${cost}] ${hubPort}: ${hubInfo || ''}`)
		}
	}).catch(e => {
		error(`#${n} C-${connectorId} <-- ${hubPort}: ${hubInfo || ''} Error=${e}`)
	})
}

async function test404(n) {
	let hubPort = config.hubPort + Math.floor(Math.random() * config.numHubNodes)
	let connectorId = Math.floor(Math.random() * config.numConnectors)
	let key = 'demoKey-' + connectorId
	
	let ret = await rbcall(`http://${config.hubHost}:${hubPort}/in-exist`, key)
	
	if (ret.statusCode !== 404) {
		error(ret)
		throw `Fail 404 test: n=${n}, key=${key}`
	}
}

log(`Testing: requests=${config.numRequests}, parallel=${config.clientParallel}`)
let tasks = [...Array(config.numRequests).keys()]

async function testWorker() {
	let err = 0
	while (true) {
		let n = tasks.pop()
		if (n === undefined)
			return err
		
		try {
			await test1(n)
		} catch (e) {
			log(e)
			err++
		}
		await delay(config.requestInterval)
	}
}

let workers = []
for (let i = 0; i < config.clientParallel; i++)
	workers.push(testWorker())

let start = Date.now()
Promise.all(workers).then(errArray => {
	let cost = Date.now() - start
	let speed = (config.numRequests * 1000 / cost) | 0
	log(`Time=${cost} (ms). ${speed} req/s (CPU=1, testLargeBody=${config.testLargeBody})`)
	
	let numErrors = errArray.reduce((accumulator, v) => accumulator + v)
	
	if (numErrors === 0) {
		log('PASS')
		process.exit(0)
	} else {
		log(`Error: ${numErrors}/${config.numRequests}`)
		log('FAILED')
		process.exit(1)
	}
}).catch(e => {
	error(e)
	log('FAILED')
	process.exit(2)
})

//hub.close()
//rbconnector.close()