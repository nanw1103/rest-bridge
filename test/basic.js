//---------------------------------------------
//	Create an echo server as REST target
//---------------------------------------------
const connect = require('connect')
const targetServer = connect()
targetServer.use('/test', function(req, res) {
	let n = Number.parseInt(req.url.substring(1))
	res.writeHead(200, {'x-ret': n})
	res.end()
})
targetServer.listen(10763, err => console.error)

//---------------------------------------------
//	Create REST-bridge Hub
//---------------------------------------------
const hub = require('../hub')

hub.registry.register({
	key: 'demoKey'
})

hub.create({
	port: 10762
})


//---------------------------------------------
//	Create REST-bridge connector
//---------------------------------------------
const rbconnector = require('../connector')
rbconnector.start({	
	hub: 'ws://localhost:10762',	
	info: {
		key: 'demoKey',
		id: 'demoConnector'
	},	
	routes: {
		'.*': 'http://localhost:10763'
	}		
})

//---------------------------------------------
//	Create a client simulator
//---------------------------------------------
const http = require('http');

let processed = 0
let total = 0
function test1(n) {
	return new Promise((resolve, reject) => {
		if (++processed % 2000 === 0) {
			let percent = (processed * 100 / total) | 0
			console.log(`Processed ${processed}, ${percent}%...`)
		}
		
		http.get(`http://localhost:10762/test/${n}`, resp => {
			let ret = resp.headers['x-ret']
			if (ret !== String(n))
				reject('Fail processing number ' + n)
			else
				resolve()
		})
	})
}

async function testSequenceN(n) {
	for (let i = 0; i < n; i++)
		await test1(i)
}

(async function() {
	//Delay for servers to connect...
	await new Promise(resolve => setTimeout(resolve, 1500))

	let parallel = 10
	let seq = 1000
	total = parallel * seq
	console.log(`Testing: requests=${total}, parallel=${parallel}, CPU=1...`)
	
	let tasks = []
	for (let i = 0; i < parallel; i++)
		tasks.push(testSequenceN(seq))
	
	let start = Date.now()
	await Promise.all(tasks)
	let cost = Date.now() - start
	let speed = (total * 1000 / cost) | 0
	console.log(`PASS: Time=${cost} (ms). ${speed} req/s`)
	//hub.close()
	//rbconnector.close()
	
	process.exit(0)

})().catch(e => {
	console.error('FAILED:', e)
	process.exit(1)
})
