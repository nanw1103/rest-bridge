const HEADER_PREFIX = 'x-rest-bridge-'

module.exports = {
	WS_AUTH_FAILURE: 4001,
	WS_SERVER_CMD_QUIT: 4002,
	HEARTBEAT_INTERVAL: 60 * 1000,
	headers: {
		PREFIX: HEADER_PREFIX,
		SEQ: HEADER_PREFIX + 'seq',
		SEQ_RESP: HEADER_PREFIX + 'seq-resp',
		CHUNKS: HEADER_PREFIX + 'chunks',
		KEY: HEADER_PREFIX + 'key',
		FORWARDED: HEADER_PREFIX + 'forwarded',
		NO_CONNECTOR: HEADER_PREFIX + 'no-connector',
		REQ_HUB_INFO: HEADER_PREFIX + 'req-hub-info',
		HUB_INFO: HEADER_PREFIX + 'hub-info',
	}
}