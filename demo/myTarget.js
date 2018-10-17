const {log, error} = require('../shared/log.js')()
const connect = require('connect')
const app = connect()

app.use('/hello', function(req, res) {
	res.end('Hello, mortal.')
})

const port = 10762
app.listen(port, err => {
	if (err)
		error(err)
	else
		log('Server listening on', port)
})