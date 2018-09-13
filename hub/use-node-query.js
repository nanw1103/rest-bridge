const {log, error} = require('../shared/log.js')(__filename)
const thisNode = require('../shared/node.js')
const constants = require('../shared/constants.js')
const rawHttp = require('../shared/raw-http.js')


async function findConnection(k) {
	let conn = this._connectionCache.get(k)
	if (conn)
		return conn

	conn = await _findConnectionFromPeers(k)
	log(`Identified peer ${conn.node.url} for connector ${k}`)
	this._connectionCache.set(k, conn)
	return conn
}

function _peerCall(peer, url) {
	let req = {
		method: 'GET',
		url: url
	}
	return new Promise((resolve, reject) => {
		rawHttp.doHttpCall(peer, req, (err, response) => {
			if (err || response.statusCode !== 200) {
				reject()
				return
			}
			
			if (response.headers[constants.headers.HUB_INFO] === thisNode.short().trim()) {
				setImmediate(() => {
					log('Removing self from peer list:', peer)
					nodes.splice(nodes.indexOf(peer), 1)					
				})
				reject()
				return
			}
			
			let buf = Buffer.concat(response.chunks)
			let text = buf.toString('utf8')
			try {
				resolve(JSON.parse(text))
			} catch (e) {
				reject(e)
			}
		})
	})	
}

async function _findConnectionFromPeers(k) {	
	
	return new Promise((resolve, reject) => {
		let failure = 0
		function failOne() {
			if (++failure === nodes.length)
				reject()
		}
		
		for (let url of nodes) {			
			_peerCall(url, `/rest-bridge/connectors/${k}`).then(ret => {
				if (ret.info) {
					resolve({
						node: {
							url: url
						}
					})
				} else {
					failOne()
				}
			}).catch(failOne)
		}
	})
}

const override = {
	findConnection: findConnection,
}

let nodes
function useNodeQuery(addresses) {
	nodes = addresses
	log('Using node-query registry:', nodes)
	Object.assign(this, override)
}

module.exports = useNodeQuery