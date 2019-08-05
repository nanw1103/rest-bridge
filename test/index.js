const fork = require('child_process').fork
const fs = require('fs')
const path = require('path')
const {error} = require('../shared/log.js')()

function runFile(name) {
	return new Promise((resolve, reject) => {
		let fileName = path.join(__dirname, name)
		let child = fork(fileName)
		child.on('exit', code => {
			if (code === 0)
				resolve()
			else
				reject()
		})
	})
}

function listTests() {
	let files = fs.readdirSync(__dirname)
	let tests = []
	for (let name of files) {
		if (!name.startsWith('test-'))
			continue
		tests.push(name)
	}
	return tests
}

(async function() {
	let result = {}
	let tests = listTests()
	for (let name of tests) {
		try {
			await runFile(name)
			result[name] = 'SUCCESS'
		} catch (e) {
			result[name] = 'FAIL'
		}
	}

	console.log('===================================')
	console.log(JSON.stringify(result, null, 4))
})().catch(error)
