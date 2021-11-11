'use strict'

import createCors from 'cors'
import {createServeFeed} from './lib/serve-feed.js'
import {encodeFeed, StationUpdate} from './lib/encode-feed.js'
import {facilitiesSource} from './lib/facilities.js'
import {logger} from './lib/logger.js'

const cors = createCors()
const {setFeed, serveFeed} = createServeFeed()

const {OPERATIONAL, CLOSED} = StationUpdate.PathwayStatus
facilitiesSource.on('data', (facilities) => {
	const entities = facilities.map((fa, i) => ({
		id: `e${i}`,
		station_update: {
			pathway: [{
				pathway_id: fa.properties.pathwayId,
			}],
			status: fa.properties.isWorking ? OPERATIONAL : CLOSED,
			// todo: alert_id
			// todo: direction
			// todo: elevator metadata as pbf extension
		},
	}))
	const feed = encodeFeed(entities)
	setFeed(feed)

	logger.debug({
		nrOfFacilities: facilities.length,
		feedSize: feed.length,
	}, 'encoded feed')
})

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
