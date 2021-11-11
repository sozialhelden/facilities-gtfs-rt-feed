'use strict'

import createCors from 'cors'
import {createServeFeed} from './lib/serve-feed.js'

const cors = createCors()
const {setFeed, serveFeed} = createServeFeed()

export const api = (req, res) => {
	cors(req, res, (err) => {
		if (err) {
			res.statusCode = err.statusCode || 500
			res.end(err + '')
			return;
		}

		const path = new URL(req.url, 'http://localhost').pathname
		// todo: serve explainer page at /
		if (path === '/feed') {
			serveFeed(req, res)
		} else {
			res.statusCode = 404
			res.end('nope')
		}
	})
}
