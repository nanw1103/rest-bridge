
function response(code, text, headers, body) {
	let msg = `HTTP/1.1 ${code}`
	if (text)
		msg += ` ${text}`
	msg += '\n'

	if (!headers)
		headers = {}
	else {
		for (let k in headers) {
			let lowerHeaders = {}
			lowerHeaders[k.toLowerCase()] = headers[k]
			headers = lowerHeaders
		}
	}
	
	if (body) {
		let type = typeof body
		if (type === 'object') {
			body = JSON.stringify(body)
			headers['content-type'] = 'application/json'
		} else if (type !== 'string')
			throw new Error('Invalid body type:', type)
		headers['content-length'] = Buffer.byteLength(body)
	}
	
	if (headers) {
		for (let k in headers) {
			msg += k + ':' + headers[k] + '\n'
		}
	}

	msg += '\n'
	if (body)
		msg += body

	return msg
}

function insertHeader(text, key, value) {
	let n = text.indexOf('\n')
	return text.substring(0, n + 1)
		+ key + ':' + value + '\n'
		+ text.substring(n + 1)
}

function getHeader(text, key) {
	let start = text.indexOf('\n') + 1
	
	do {
		let end = text.indexOf('\n', start)
		if (end === start || end < 0)
			return
		
		let sep = text.indexOf(':', start)
		if (sep < 0 || sep > end)
			return
		let name = text.substring(start, sep)
		if (name === key) {
			return text.substring(sep + 1, end)
		}
		start = end + 1
	} while(true)
}

function removeHeader(text, key) {
	let start = text.indexOf('\n') + 1
	
	do {
		let end = text.indexOf('\n', start)
		if (end === start || end < 0)
			return {text: text}
		
		let sep = text.indexOf(':', start)
		if (sep < 0 || sep > end)
			return {text: text}
		let name = text.substring(start, sep)
		if (name === key)
			return {
				text: text.substring(0, start) + text.substring(end + 1),
				value: text.substring(start + 1, end)
			}
		start = end + 1
	} while(true)
}

function parseReq(data) {
	let ret = {
		method: null,
		path: null,
		headers: {},
		body: null
	}
	
	let pathStart = data.indexOf(' ')
	ret.method = data.substring(0, pathStart)
	++pathStart
	let pathEnd = data.indexOf(' ', pathStart)
	ret.path = data.substring(pathStart, pathEnd)
	
	let lineEnd = data.indexOf('\n', pathEnd)
	let lineStart = lineEnd + 1
	while (1) {
		lineEnd = data.indexOf('\n', lineStart)
		let line = data.substring(lineStart, lineEnd)	
		if (line.length === 0)
			//end of header
			break
		let i = line.indexOf(':')
		let k = line.substring(0, i).trim().toLowerCase()
		let v = line.substring(i + 1).trim()
		ret.headers[k] = v
		lineStart = lineEnd + 1
	}
	ret.body = data.substring(lineEnd + 1)
	return ret
}

function parseResp(text) {
	let ret = {
		httpVersion: '',
		statusCode: 0,
		statusMessage: '',
		headers: {},
		body: ''
	}
	
	let start = text.indexOf(' ')
	ret.httpVersion = text.substring(5, start)

	++start
	let end = text.indexOf(' ', start)	
	ret.statusCode = Number.parseInt(text.substring(start, end))

	let lineEnd = text.indexOf('\n')
	ret.statusMessage = text.substring(end + 1, lineEnd)	
	
	while (1) {
		let lineStart = lineEnd + 1
		lineEnd = text.indexOf('\n', lineStart)
		let line = text.substring(lineStart, lineEnd).trim()
		if (line.length === 0)
			//end of header
			break
		let i = line.indexOf(':')
		let k = line.substring(0, i).trim().toLowerCase()
		let v = line.substring(i + 1).trim()
		ret.headers[k] = v
	}
	ret.body = text.substring(lineEnd + 1)
	return ret
}

function resToText(res) {
	let text = `HTTP/${res.httpVersion} ${res.statusCode} ${res.statusMessage}
`
	for (let k in res.headers)
		text += k + ':' + res.headers[k] + '\n'
	text += '\n'
	if (res.body)
		text += res.body
	return text
}

function resToHead(res) {
	let text = `HTTP/${res.httpVersion} ${res.statusCode} ${res.statusMessage}
`
	for (let k in res.headers)
		text += k + ':' + res.headers[k] + '\n'
	text += '\n'
	return text
}

function reqToText(req) {
	let text = req.method + ' ' + req.url + ' HTTP/' + req.httpVersion + '\n'
	
	for (let k in req.headers)
		text += k + ':' + req.headers[k] + '\n'
	text += '\n'
	if (typeof req.body === 'string') {
		text += req.body
	}
	return text
}

module.exports = {
	response: response,

	removeHeader: removeHeader,
	getHeader: getHeader,
	insertHeader: insertHeader,

	parseReq: parseReq,
	parseResp: parseResp,

	reqToText: reqToText,
	resToText: resToText,

	resToHead: resToHead
}