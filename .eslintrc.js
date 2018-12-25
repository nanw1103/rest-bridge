module.exports = {
	"env": {
		"es6": true,
		"node": true
	},
	"extends": "eslint:recommended",
	"parserOptions": {
		"sourceType": "module",
		"ecmaVersion": 8,
		"ecmaFeatures": {
		}
	},
	"rules": {
		"indent": [
			"error",
			"tab"
		],
		"quotes": [
			"error",
			"single"
		],
		"semi": [
			"error",
			"never"
		],
		"no-console": 0,
		"no-inner-declarations": 0,
		"no-empty": 0,
		"no-constant-condition": 0,
		"no-trailing-spaces": [
			"error"
		],
		"no-shadow": ["warn", { "builtinGlobals": true, "hoist": "all", "allow": [] }],
		"no-use-before-define": ["error", { "functions": false, "classes": false }],
		"no-unused-vars": ["warn", { "vars": "all", "args": "after-used", "ignoreRestSiblings": false }],
		"no-async-promise-executor": ["error"],
		"no-extra-parens": ["error"],
		"no-misleading-character-class": ["error"],
		"no-prototype-builtins": ["error"],
		"no-template-curly-in-string": 0,
		"require-atomic-updates": ["error"],
	}
}