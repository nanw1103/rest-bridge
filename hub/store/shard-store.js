const MemStore = require('./mem-store.js')

class ShardStore {

	constructor(peers, connectSvr, httpClient) {
		this.peers = peers
		this.memStore = new MemStore
		this.httpClient = httpClient

		this.uid = Math.random().toString(36).slice(2).padEnd(12, '0')

		connectSvr.use('/rest-bridge/shard-store', (req, res) => {
			let k = req.url.substring(1)
			this._getLocal(k)
				.then(d => _sendJSON(res, d))
				.catch(e => _sendJSON(res, {
					error: e.toString(),
					shardStoreUid: this.uid
				}))
		})
	}

	set(k, obj) {
		return this.memStore.set(k, obj)
	}

	async get(k) {
		try {
			return await this._getLocal(k)
		} catch(e) {
			//omit
		}

		return new Promise((resolve, reject) => {
			let failure = 0
			function failOne() {
				if (++failure === this.peers.length)
					reject()
			}

			for (let p of this.peers) {
				this.httpClient.get(`http://{p}/rest-bridge/shard-store/${k}`).then(d => {
					if (d.error) {
						if (d.shardStoreUid === this.uid)
							setImmediate(() => this.peers.splice(this.peers.indexOf(p), 1))
						return
					}

					resolve(d)
				}).catch(failOne)
			}
		})
	}

	async _getLocal(k) {
		return this.memStore.get(k)
	}

	remove(k) {
		return this.memStore.remove(k)
	}

	list(path) {
		return this.memStore.get(path)
	}

	async has(k) {
		let o = await this.get(k)
		return !!o
	}

	init(options) {
		return this.memStore.init(options)
	}
}

function _sendError(res, err, headers) {
	_sendJSON(res, {error: err.toString()}, headers)
}

function _sendJSON(res, obj, additionalHeaders) {
	let text = JSON.stringify(obj, null, 4)
	let headers = Object.assign({}, additionalHeaders, {
		'content-type': 'application/json',
		'content-length': Buffer.byteLength(text),
	})
	res.writeHead(200, headers)
	res.end(text)
}

module.exports = ShardStore