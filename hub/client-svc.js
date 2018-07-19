//const {log, error} = require('../shared/log.js')(__filename)
const constants = require('../shared/constants.js')
const rawHttp = require('../shared/raw-http.js')

const connectorSvc = require('./connector-svc.js')

let seq_counter = 0

const stat = {
	incoming: 0,
	missingConnector: 0,
	connectorFailure: 0,
}

function init(app) {
		
	// respond to all requests
	app.use(function(req, res){
		
		//log(req.method, req.url)
		stat.incoming++
		
		let headers = req.headers
		let k = headers[constants.headers.KEY]
		let connector = connectorSvc.findConnector(k)
		if (!connector) {
			res.writeHead(503, 'Connector not found')
			res.end()
			stat.missingConnector++
			return
		}
		
		let seq = ++seq_counter
		headers[constants.headers.SEQ] = seq
		let text = rawHttp.reqToText(req)
		connector.send(text, seq, (err, result) => {
			if (res.finished)
				return
			
			if (err) {
				res.writeHead(503, 'WS failure: ' + err)
				res.end()
				stat.connectorFailure++
				return
			}

			//log('result.headers', result.headers)
			res.writeHead(result.statusCode, result.headers)
			res.statusMessage = result.statusMessage
			if (result.body) {
				res.write(result.body)
			} else if (result.chunks) {
				for (let c of result.chunks) {
					//log('writing chunk', c.length)
					res.write(c)
				}	
			}
			
			res.end()
		})
	})
}

module.exports = {
	init: init,
	stat: stat
}
