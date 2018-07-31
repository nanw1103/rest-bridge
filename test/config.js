///////////////////////////////////////
//	Default
///////////////////////////////////////
const defaultConfig = {
	//target config
	numTargets: 3,
	
	//hub config
	numHubNodes: 3,
	store: null,	//'fs-store:/rest-bridge-test',
	
	//connector config
	hubHost: 'localhost',
	hubPort: 10763,
	targetHost: 'localhost',
	targetPort: 10762,
	numConnectors: 3,
	
	//client config
	numClients: 5,
	numRequests: 10000,
	testLargeBody: false,
	requestInterval: 0,
	restartClient: false,

	//common args for cluster
	fromIndex: 0,
	monkey: false
}

///////////////////////////////////////
//	Actual
///////////////////////////////////////
let actual = Object.assign({}, defaultConfig)

function override(name, value, errorOnMissing) {
	if (!(name in defaultConfig)) {
		if (errorOnMissing)
			throw new Error('Key is not in default config:', name)
		return
	}
	
	let defaultValue = defaultConfig[name]
	let v
	if (typeof defaultValue === 'number') {
		v = Number.parseInt(value)
		//let vfloat = Number.parseFloat(value)
		if (Number.isNaN(v))
			throw new Error(`Invalid integer value. name=${name}, value=${value}`)
	} else if (typeof defaultValue === 'boolean') {
		if (typeof value === 'boolean') {
			v = value
		} else {
			value = value.toLowerCase()
			if (value === 'true')
				v = true
			else if (value === 'false')
				v = false
			else
				throw new Error(`Invalid boolean. name=${name}, v=${value}`)
		}
	} else {
		if (defaultValue === null || typeof defaultValue === 'string') {
			v = value
		} else {
			throw new Error(`Invalid argument. Assigning to non-primitive type. name=${name}, typeof default value=${typeof defaultValue}`)
		}
	}
	
	actual[name] = v
	//console.log(`config override: ${name}=${v}`)
}

///////////////////////////////////////
//	1. Override by environment variable
///////////////////////////////////////
const PREFIX = 'rbtest_'
for (let k in process.env) {
	if (!k.startsWith(PREFIX))
		continue
	
	let name = k.substring(PREFIX.length)
	let value = process.env[k]
	override(name, value, true)
	
}

///////////////////////////////////////
//	2. Override by process args
///////////////////////////////////////
for (let i = 2; i < process.argv.length; i++) {
	let arg = process.argv[i]
	let s = arg.indexOf('=')
	
	let name
	let v
	if (s < 0) {
		name = arg
		v = true
	} else {
		name = arg.substring(0, s)
		v = arg.substring(s + 1)
	}
	override(name, v)
}

module.exports = actual