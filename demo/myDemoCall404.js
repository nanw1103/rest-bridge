const rbcall = require('../shared/rbcall.js')

rbcall('http://localhost/in-exist', 'demoKey')
	.then(res => {
		if (res.statusCode === 404)
			console.log('SUCCESS')
		else
			console.error('FAILED:', res)
	})
	.catch(console.error)
