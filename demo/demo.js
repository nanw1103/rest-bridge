
const demoDelay = millis => new Promise(resolve => setTimeout(resolve, millis))
const fork = module => require('child_process').fork(__dirname + '/' + module);

//This demo shows how hub, connector, target and http client works.
(async function() {

	//create a http service as target to be called.
	//Normally this is an existing service.
	fork('myTarget.js')

	//Create a hub, which accepts connections from connectors
	fork('myHub.js')

	await demoDelay(2000)
	
	//Create a connector which connects to hub, and forwards requests to target
	fork('myConnector.js')
	
	await demoDelay(2000)

	//Create a rest client, which needs to call the target service, 
	//but here we call the hub instead.
	return new Promise(resolve => fork('myDemoCall.js').on('exit', resolve))
})()
	.catch(console.error)
	.then(process.exit)