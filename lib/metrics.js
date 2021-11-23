'use strict'

import promClient from 'prom-client'
import {createServer} from 'http'

const {
	collectDefaultMetrics,
	register,
} = promClient

collectDefaultMetrics()

export const metrics = promClient

export const handleMetricsRequest = (req, res) => {
	if (req.method !== 'GET' && req.method !== 'POST') {
		res.writeHead(405)
		res.end()
		return;
	}

	register.metrics()
	.then((metrics) => {
		res.setHeader('Content-Type', register.contentType)
		res.end(metrics)
	})
	.catch((err) => {
		res.statusCode = 500
		res.setHeader('Content-Type', 'text/plain')
		res.end(err + '\n' + err.stack)
	})
}
