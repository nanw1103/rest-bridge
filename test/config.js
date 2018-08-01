const url = require('url')
const config = require('./config-util.js')('./_settings.js')

function parseEndpoint(str) {
	if (str[str.length -1] !== '/')
		str += '/'
	let parsed = url.parse(str)

	let port = Number.parseInt(parsed.port)

	if (!port) {
		let defaultPortMap = {
			'http:': 80,
			'ws:': 80,
			'https': 443,
			'wss:': 443
		}
		port = defaultPortMap[parsed.protocol]
		if (!port)
			throw 'Can not identify port in url: ' + str
	}
	
	return {
		host: parsed.hostname,
		port: port
	}
}

let hub = parseEndpoint(config.hub)
config.hubHost = hub.host
config.hubPort = hub.port

let target = parseEndpoint(config.target)
config.targetHost = target.host
config.targetPort = target.port

module.exports = config


