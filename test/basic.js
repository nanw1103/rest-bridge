const delay = millis => new Promise(resolve => setTimeout(resolve, millis))

let role = process.argv[2]
if (!role)
	role = 'master'
switch (role) {
	case 'hub':			return createHub()
	case 'connector':	return createConnector()
	case 'target':		return createTargetService()
	case 'master':		return createTestMaster()
	default:			throw 'Invalid role ' + role
}
log('Node started:', role)

function log() {
	const util = require('util')
	let logContent = util.format.apply(null, arguments)
	let timeString = new Date().toLocaleString()
	logContent = timeString + ' O [' + role + '] '  + logContent + '\n'
	process.stdout.write(logContent)
}

//------------------------------------------------------------------------------------------
//	Create REST-bridge Hub
//	It accpets connections from clients and connectors. 
//	Forward requests from client to connector, and forward response from connector to client.
//------------------------------------------------------------------------------------------
function createHub() {
	const hub = require('../hub')

	hub.registry.register({
		key: 'demoKey'
	})

	hub.create({
		port: 10762
	})
}

//------------------------------------------------------------------------------------------
//	Create REST-bridge connector
//	It connects to hub, and target service. 
//	Conector forward requests from hub to target service, and response from target to hub.
//------------------------------------------------------------------------------------------
function createConnector() {		
	const rbconnector = require('../connector')
	rbconnector.start({	
		hub: 'ws://localhost:10762',	
		info: {
			key: 'demoKey'
		},	
		routes: {
			'.*': 'http://localhost:10763'
		}		
	})
}

//------------------------------------------------------------------------------------------
//	Create REST service for testing.
//------------------------------------------------------------------------------------------
function createTargetService() {
	const connect = require('connect')
	const targetServer = connect()
	targetServer.use('/test', function(req, res) {
		let n = Number.parseInt(req.url.substring(1))
		res.writeHead(200, {'x-ret': n})
		res.end()
	})
	targetServer.listen(10763, err => log)
}

//------------------------------------------------------------------------------------------
//	Create a client simulator
//	Client simulator sends thousands of requests to hub and verifies results.
//------------------------------------------------------------------------------------------
async function createClientSimulator() {
	const http = require('http');

	let processed = 0
	let total = 0
	function test1(n) {
		return new Promise((resolve, reject) => {
			if (++processed % 2000 === 0) {
				let percent = (processed * 100 / total) | 0
				log(`Processed ${processed}, ${percent}%...`)
			}
			
			/*
			let options = {
				method: 'GET',
				hostname: 'localhost',
				port: 10762,
				path: `/test/${n}`,
				headers: {
					'x-rest-bridge-key': 'demoKey'
				}
			}
			*/
			http.get(`http://localhost:10762/rest-bridge-forward/demoKey/test/${n}`, resp => {
			//http.request(options, resp => {
				
				let success = resp.headers['x-ret'] === String(n) 
				return success ? resolve() : reject('Fail processing number ' + n)
			}).on('error', console.error)
		})
	}

	async function testSequenceN(n) {
		for (let i = 0; i < n; i++)
			await test1(i)
	}

	let parallel = 10
	let seq = 1000
	total = parallel * seq
	log(`Testing: requests=${total}, parallel=${parallel}, CPU=1...`)
	
	let tasks = []
	for (let i = 0; i < parallel; i++)
		tasks.push(testSequenceN(seq))
	
	let start = Date.now()
	await Promise.all(tasks)
	let cost = Date.now() - start
	let speed = (total * 1000 / cost) | 0
	log(`Time=${cost} (ms). ${speed} req/s`)
	log('PASS')
	//hub.close()
	//rbconnector.close()
}

function createChild(role) {
	log('Creating node:', role)
	const util = require('util')
	//const fork = util.promisify(require('child_process').fork)
	const fork = require('child_process').fork
	let modulePath = process.argv[1]
	fork(modulePath, [role])
	log('Node created:', role)
}

function createTestMaster() {
	createTestMasterImpl().then(() => {
		process.exit(0)
	}).catch(e => {
		log('FAILED:', e)
		process.exit(1)
	})
}

async function createTestMasterImpl() {
	
	createChild('target')
	createChild('hub')
	await delay(2000)
	createChild('connector')
	await delay(2000)
	
	await createClientSimulator()
}
