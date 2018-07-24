'use strict'
const util = require('util')
const fs = require('fs')
const path = require('path')
const thisNode = require('./node.js')

let logFile = process.env['launchpad_log']
let usingFile = logFile && logFile.length > 0

if (!usingFile) {
	//backward compatibility
	logFile = process.env['launchpad.log']
	usingFile = logFile && logFile.length > 0
}

//----------------------------------------------------------------------
//	Rolling logs
//----------------------------------------------------------------------
var logOut
var logErr

if (usingFile) {
	const LOG_LENGTH_LIMIT = 512 * 1024
	const NUM_LOGS_TO_KEEP = 10
	let currentLogLength = -1

	process.stdout.write('Using log file: ' + logFile + '\r\n')

	function rollLogs() {
		currentLogLength = 0

		function rollOut(i) {
			let fileName = i == 0 ? logFile : (logFile + '.' + i)
			try {
				if (!fs.existsSync(fileName)) {
					return
				}
				if (i >= NUM_LOGS_TO_KEEP - 1) {
					fs.unlinkSync(fileName)
					return
				}
				rollOut(i + 1)
				fs.renameSync(fileName, logFile + '.' + (i + 1))
			} catch (e) {
				process.stderr.write(e.toString())
			}
		}
		rollOut(0)
	}
	if (currentLogLength === -1)
		rollLogs()

	logOut = logErr = {
		write: (text) => {
			try {
				fs.writeFileSync(logFile, text, { flag: 'a' })
			} catch (e) {
				process.stderr.write(e.toString())
			}
			if ((currentLogLength += text.length) >= LOG_LENGTH_LIMIT)
				rollLogs()
		}
	}
} else {
	logOut = process.stdout
	logErr = process.stderr
}

//----------------------------------------------------------------------
//	Redirect Console log
//----------------------------------------------------------------------
function log() {
	logOut.write(formatLogContent(arguments, ' O '))
}
function error() {
	let text = formatLogContent(arguments, ' E ')
	if (!usingFile) {
		text = '\u001b[91m' + text + '\u001b[39m'
	}
	logErr.write(text)
}

//console.log = log
//console.error = error

function formatLogContent(args, prefix) {
	maskPassword(args)
	let logContent = util.format.apply(null, args)
	let timeString = new Date().toLocaleString()
	logContent = timeString + prefix + thisNode.short() + ' - ' + logContent
	return logContent + '\n'
}

function maskPassword(args) {

	function maskObj(o) {
		let changed
		for (let k in o) {
			if (k.toLowerCase().indexOf('password') >= 0) {
				o[k] = '********'
				changed = true
				continue
			}

			let v = o[k]
			if (typeof v === 'object')
				changed |= maskObj(v)
		}
		return changed
	}

	function maskString(s) {
		let PATTERN = /(["'][^"']*password[^"']*["']\s*:\s*["'])([^'"]*)(["'])/img
		s = s.replace(PATTERN, '$1********$3')

		//"/passwordd:VMware123"
		PATTERN = /(.* \/passwordd:)(.*)(\s*.*)/img
		s = s.replace(PATTERN, '$1********$3')
		return s
	}

	for (let k in args) {
		let v = args[k]

		try {
			if (typeof v === 'string') {
				args[k] = maskString(v)
				continue
			}

			if (typeof v !== 'object')
				continue

			let tmp = JSON.parse(JSON.stringify(v))	//make a copy to avoid changing passed-in object
			if (maskObj(tmp))
				args[k] = tmp
		} catch (e) { }
	}
}

function findModuleName(fileName) {

	let name = path.basename(fileName)
	if (name.endsWith('.js'))
		name = name.substr(0, name.length - 3)

	if (name === 'index') {
		let dir = path.dirname(fileName)
		name = path.basename(dir)
		if (name === 'lib')
			name = path.basename(path.dirname(dir))
	}
	return name	
}

module.exports = function(fileName, pad) {

	let prefix
	let moduleName = findModuleName(fileName)
	if (moduleName) {
		if (pad)
			moduleName = moduleName.padEnd(pad)
		prefix = '[' + moduleName + ']'
	} else
		prefix = ''

	function logger() {
		let tmp = [].slice.call(arguments)
		tmp.unshift(prefix)
		log.apply(null, tmp)
	}
	function logError() {
		let tmp = [].slice.call(arguments)
		tmp.unshift(prefix)
		error.apply(null, tmp)
	}
	logger.log = logger
	logger.error = logError
	return logger
}
