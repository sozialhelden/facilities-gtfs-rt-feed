import {createServer} from 'http'
import {api} from '../api.js'

const server = createServer(api)
server.listen((err) => {
	if (err) {
		console.error(err)
		process.exit(1)
	}

	// todo
	console.error(server.address())
})
