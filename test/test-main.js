const fork = require('child_process').fork

function test(testForward, testLargeBody, store) {
	
	console.log('---------------------------------------------------------------------------')
	console.log(`testForward=${testForward}, testLargeBody=${testLargeBody}, store=${store ? store : 'default'}`)
	console.log('---------------------------------------------------------------------------')
	
	let args = ['role=test-master', `testForward=${testForward}`, `testLargeBody=${testLargeBody}`]
	if (store)
		args.push(`store=${store}`)
	
	return new Promise((resolve, reject) => {
		let onExit = code => code === 0 ? resolve() : reject()		
		fork(__dirname + '/test-impl.js', args)
			.on('exit', onExit)
	})
}

(async function() {
	await test(false, false)	//default mem-store
	await test(true, false)	//default cluster-mem-store
	await test(true, false, 'fs-store:/efs/rest-bridge')
	await test(true, true)	//default cluster-mem-store
	await test(true, true, 'fs-store:/efs/rest-bridge')
})().catch(console.error)