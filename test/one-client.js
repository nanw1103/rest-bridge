'use strict'
const url = require('url')
const http = require('http')
const {log, error} = require('../shared/log.js')(__filename)
const config = require('./config.js')

const delay = millis => new Promise(resolve => setTimeout(resolve, millis))

let processed = 0
let total = 0
function test1(n) {
	if (++processed % 2000 === 0) {
		let percent = (processed * 100 / total) | 0
		log(`Processed ${processed}, ${percent}%...`)
	}
	
	let connectorId = Math.floor(Math.random() * config.numConnectors)
	let hubPort = config.hubPort + Math.floor(Math.random() * config.numHubNodes)
	
	//*
	let options = {
		method: 'POST',
		hostname: config.hubHost,
		port: hubPort,
		path: `/test/${n}`,
		headers: {
			'x-rest-bridge-key': 'demoKey-' + connectorId
		}
	}
	
	let bodyLength
	if (config.testLargeBody) {
		let maxLen = 1024 * 1024
		bodyLength = Math.floor(Math.random() * maxLen)
		
		options.headers['content-type'] = 'text/plain'
		options.headers['content-length'] = bodyLength
	}	
	//*/	
	
	return new Promise((resolve, reject) => {
		//http.get(`http://localhost:10763/rest-bridge-forward/demoKey-${connectorId}/test/${n}`, resp => {
		let req = http.request(options, resp => {
			let ret = resp.headers['x-ret']
			let success = ret === String(n)
			if (!success) {
				error('status', resp.statusCode, resp.statusMessage)
				return reject(`Fail test req #${n} on connector ${connectorId}`)
			}
			
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
			console.error('client req error', err.toString())
			reject(err)
		})
		
		if (config.testLargeBody) {
			let body = ''.padEnd(bodyLength, '.')
			req.write(body)
		}
		
		req.end()
	})
}

async function testSequenceN(n) {
	for (let i = 0; i < n; i++) {
		await test1(i)
		
		if (config.requestInterval)
			await delay(config.requestInterval)
	}
}

let parallel = 10
total = config.numRequests
let seq = total / parallel
log(`Testing: requests=${total}, parallel=${parallel}`)

let tasks = []
for (let i = 0; i < parallel; i++)
	tasks.push(testSequenceN(seq))

let start = Date.now()
Promise.all(tasks).then(() => {
	let cost = Date.now() - start
	let speed = (total * 1000 / cost) | 0
	log(`Time=${cost} (ms). ${speed} req/s (CPU=1, testLargeBody=${config.testLargeBody})`)
	log('PASS')
	process.exit(0)
}).catch(e => {
	error(e)
	log('FAILED')
	process.exit(1)
})

//hub.close()
//rbconnector.close()