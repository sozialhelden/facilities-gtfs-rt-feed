import {createServer} from 'http'
import {api} from './api.js'
import {logger} from './lib/logger.js'
import {withSoftExit} from './lib/soft-exit.js'

const port = parseInt(process.env.PORT || 3000)

export const server = createServer(api)

server.listen(port, (err) => {
	if (err) {
		logger.error(err)
		process.exit(1)
	} else {
		logger.info('listening on port ' + port)
		withSoftExit(() => server.close())
	}
})
