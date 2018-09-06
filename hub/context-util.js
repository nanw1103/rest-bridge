module.exports = {
	makeContext: (base, path) => {
		if (!base || base === '/')
			return path
		if (base[base.length - 1] === '/')
			base = base.substring(0, base.length - 1)
		return base + path
	}
}