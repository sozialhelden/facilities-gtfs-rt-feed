'use strict'

import createCors from 'cors'
import express from 'express'
import {createServeFeed} from './lib/serve-feed.js'
import {encodeFeed, StationUpdate} from './lib/encode-feed.js'
import {facilitiesSource} from './lib/facilities.js'
import {logger} from './lib/logger.js'

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

export const api = express()
api.use(createCors())

// todo: serve explainer page at /

api.use('/feed', serveFeed)
