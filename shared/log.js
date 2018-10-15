'use strict'
const nwlog = require('newheelog')

nwlog.config({
	//colorizeConsole: false,
	moduleNamePadding: 14,
})

const { error } = nwlog(__filename)

process.on('uncaughtException', err => {
	error('uncaughtException', err)
	process.exit(11)
})

process.on('unhandledRejection', (reason, p) => {
	error('Unhandled Rejection at: Promise', p, 'reason:', reason)
	process.exit(12)
})

module.exports = nwlog