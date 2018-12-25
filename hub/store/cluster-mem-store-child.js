const clusterCall = require('cluster-call')

function ChildStore(id) {
	const obj = {
		id: id
	}
	const handler = {
		get: function(o, k) {
			if (k in o)
				return o[k]

			return function() {
				let args = [].slice.apply(arguments)
				return clusterCall('master').clusterMemStoreOp(id, k, args)
			}
		}
	}
	return new Proxy(obj, handler)
}

module.exports = ChildStore
