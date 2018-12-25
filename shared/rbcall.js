const url = require('url')

function rbcall(target, rbkey, options) {

	let targetUrl = url.parse(target)
	options = Object.assign({headers:{}}, options, targetUrl)

	if (rbkey) {
		options.headers['x-rest-bridge-key'] = rbkey
	}

	let httplib
	if (options.httplib)
		httplib = options.httplib
	else {
		let tmp = target.toString().toLowerCase()
		if (tmp.startsWith('https://'))
			httplib = require('https')
		else
			httplib = require('http')
	}

	return new Promise((resolve, reject) => {
		let req = httplib.request(options, resp => {
			let ret = {
				statusCode: resp.statusCode,
				statusMessage: resp.statusMessage,
				headers: resp.headers,
				body: ''
			}
			resp.setEncoding('utf8')
				.on('data', chunk => ret.body += chunk)
				.on('end', () => resolve(ret))
		})
		req.on('error', reject)
		if (options.data)
			req.write(options.data)
		req.end()
	})
}

module.exports = rbcall