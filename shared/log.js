'use strict'
const newheelog = require('newheelog')

newheelog.config({
	colorizeConsole: false,
	moduleNamePadding: 14,
})

const { error } = newheelog()

process.on('uncaughtException', err => {
	error('uncaughtException', err)
	process.exit(11)
})

process.on('unhandledRejection', (reason, p) => {
	error('Unhandled Rejection at: Promise', p, 'reason:', reason)
	process.exit(12)
})

module.exports = newheelog