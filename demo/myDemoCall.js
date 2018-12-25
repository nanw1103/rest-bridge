const http = require('http')

//To do a rest-bridge call, a pairing key must be specified, so as to distinguish
//which connector to use. The pairing key can be specified either in request
//header, or request path.
//Use vanilla http lib here for less dependencies for demo purpose.

//Method 1 - Specify pairing key in header
let options = {
	host: 'localhost',
	path: '/hello',
	headers: {
		'x-rest-bridge-key': 'demoKey'	//specify which connector we are using
	}
}
http.get(options, resp => {
	let body = ''
	resp.setEncoding('utf8')
		.on('data', chunk => body += chunk)
		.on('end', () => {
			console.log(body)
			if (body === 'Hello, mortal.')
				console.log('SUCCESS')
			else
				console.error('FAILED')
		})
}).on('error', console.error)
	.end()

//Method 2 - Specify pairing key in request path.
//This method requires a fixed base path to be added
//http.get('http://localhost/rest-bridge-forward/<pairingKey>/hello')

