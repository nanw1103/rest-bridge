const HEADER_PREFIX = 'x-rest-bridge-'

module.exports = {
	AUTH_FAILURE: 4001,
	HEARTBEAT_INTERVAL: 6 * 1000,
	headers: {
		PREFIX: HEADER_PREFIX,
		SEQ: HEADER_PREFIX + 'seq',
		SEQ_RESP: HEADER_PREFIX + 'seq-resp',
		CHUNKS: HEADER_PREFIX + 'chunks',
		KEY: HEADER_PREFIX + 'key',
		FORWARDED: HEADER_PREFIX + 'forwarded',
		NO_CONNECTOR: HEADER_PREFIX + 'no-connector'
	}
}