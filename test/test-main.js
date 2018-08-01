//Trick for test: enforce local setting
const fs = require('fs')
fs.createReadStream('./settings-local.js')
	.pipe(fs.createWriteStream('./_settings.js'));

(async function() {
	
	await test('basic', {
		hub: 1,
		connector: 1,
		client: 1,
		target: 1,		
		largeBody: false,
		store: '',		//default mem-store
		request: 10000
	})
	
	await test('internal forward', {
		hub: 2,
		connector: 1,
		client: 1,
		target: 1,
		largeBody: false,
		store: '',		//default cluster-mem-store
		request: 10000
	})
	
	await test('large body and forward', {
		hub: 2,
		connector: 1,
		client: 1,
		target: 1,		
		largeBody: true,
		store: '',		//default cluster-mem-store
		request: 200
	})
	
	await test('file store', {
		hub: 2,
		connector: 1,
		client: 1,
		target: 1,		
		largeBody: false,
		store: 'fs-store:/rest-bridge-test',
		request: 10000
	})
	
	await test('multiple nodes', {
		hub: 3,
		connector: 7,
		client: 20,
		target: 3,
		largeBody: true,
		store: 'fs-store:/rest-bridge-test',
		request: 100
	})
})().catch(e => {
	if (e)
		console.error('Failed', e)
	else
		console.error('Failed')
})

function test(name, options) {
	
	console.log('------------------------------------------------------------------------------------------')
	console.log(`Test [${name}]`, JSON.stringify(options))
	console.log('------------------------------------------------------------------------------------------')

	process.env.rbtest_numHubNodes = options.hub
	process.env.rbtest_numConnectors = options.connector
	process.env.rbtest_numClients = options.client
	process.env.rbtest_numTargets = options.target
	process.env.rbtest_testLargeBody = options.largeBody
	process.env.rbtest_store = options.store
	process.env.rbtest_numRequests = options.request
	process.env.rbtest_requestInterval = 0
	
	const fork = require('child_process').fork
	
	return new Promise((resolve, reject) => {
		let onExit = code => code === 0 ? resolve() : reject()		
		fork(__dirname + '/impl.js')
			.on('exit', onExit)
	})
}
