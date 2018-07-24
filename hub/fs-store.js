const fs = require('fs')

const defaultOptions = {
	retry: 3,
	retryInterval: 2000,
	json: true
}

class FsStore {

	constructor(repo, options) {
		this.repo = repo
		this.options = Object.assign({}, defaultOptions, options)
	}
	
	set(k, obj) {
		
		if (this.options.json)
			obj = JSON.stringify(obj, null, 4)
		
		let path = this.repo + '/' + k
		
		return new Promise((resolve, reject) => {
			let failure = 0
			const writeImpl = () => {
				fs.writeFile(path, obj, err => {
					if (err) {
						if (++failure < this.options.retry) {
							setTimeout(writeImpl, this.options.retryInterval)
						} else {
							reject(k)
						}
					} else {
						resolve()
					}
				})
			}
			writeImpl()
		})
	}
	
	get(k) {
		let path = this.repo + '/' + k
		//require('../shared/log.js')(__filename).log('store get', path)

		return new Promise((resolve, reject) => {
			fs.readFile(path, 'utf8', (err, data) => {
				if (err)
					return reject(err)
				
				if (this.options.json) {
					try {
						let obj = JSON.parse(data)
						resolve(obj)
					} catch (e) {
						reject(err)
					}
				} else {
					resolve(data)
				}
			})
		})
	}
	
	list(path) {
		path = this.repo + '/' + path
		return new Promise((resolve, reject) => {
			fs.readdir(path, (err, files) => {
				if (err)
					return reject(err)
				resolve(files)
			})
		})
	}
	
	mkdir(path) {
		return new Promise((resolve, reject) => {
			let cb = err => err ? reject(err) : resolve()
			fs.mkdir(this.repo + '/' + path, cb)
		})		
	}
	
	exists(k) {
		let path = this.repo + '/' + k
		return new Promise(resolve => {
			let cb = err => resolve(!err)
			fs.access(path, cb)
		})
	}

	async init(paths) {
		const md = async name => {
			let exists = await this.exists(name)
			if (exists)
				return
			return this.mkdir(name)
		}
		
		await md('')
		for (let p of paths) {
			await md(p)
		}
	}
}

module.exports = FsStore