const rbcall = require('../shared/rbcall.js')

function basicCases(hubAddress, pairingKey) {

	hubAddress = hubAddress || 'http://localhost:81'
	pairingKey = pairingKey || 'demoKey'

	async function testBasic() {
		let ret = await rbcall(`${hubAddress}/hello`, pairingKey)
		return ret.body === 'Hello, mortal.'
	}

	async function test404() {
		let ret = await rbcall(`${hubAddress}/in-exist`, pairingKey)
		return ret.statusCode === 404
	}

	async function testRbKeyInContext() {
		let ret = await rbcall(`${hubAddress}/rest-bridge-forward/${pairingKey}/hello`)
		return ret.body === 'Hello, mortal.'
	}

	async function testSmallBody() {
		let len = 1024
		let text = ''.padEnd(len)
		let ret = await rbcall(`${hubAddress}/testBody`, pairingKey, {
			method: 'post',
			data: text,
			headers: {
				'content-type': 'text/plain',
				//'content-length': len
			}
		})
		return ret.body === '' + len
	}

	async function testLargeBody() {
		let len = Math.random() * 1024 * 1024 | 0
		let text = ''.padEnd(len)
		let ret = await rbcall(`${hubAddress}/testBody`, pairingKey, {
			method: 'post',
			data: text,
			headers: {
				'content-type': 'text/plain',
				//'content-length': len
			}
		})
		return ret.body === '' + len
	}

	return [
		testBasic,
		testRbKeyInContext,
		test404,
		testSmallBody,
		testLargeBody,
	]
}

module.exports = basicCases