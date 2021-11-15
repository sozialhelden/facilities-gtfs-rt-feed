'use strict'

import createCors from 'cors'
import express from 'express'
import {createServeFeed} from './lib/serve-feed.js'
import {encodeFeed, StationUpdate} from './lib/encoding.js'
import {facilitiesSource} from './lib/facilities.js'
import {mergeFeedEntitiesWithForeignFeed} from './lib/merge-with-foreign-feed.js'
import {logger} from './lib/logger.js'

const {setFeed, serveFeed} = createServeFeed()

const {OPERATIONAL, CLOSED} = StationUpdate.PathwayStatus

let entities = []
let feed = encodeFeed(entities)
setFeed(feed)
facilitiesSource.on('data', (facilities) => {
	entities = facilities.map((fa, i) => ({
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
	feed = encodeFeed(entities)
	setFeed(feed)

	logger.debug({
		nrOfFacilities: facilities.length,
		feedSize: feed.length,
	}, 'updated unmerged feed')
})

export const api = express()
api.use(createCors())

// todo: serve explainer page at /

api.use('/feed', async (req, res, next) => {
	// todo: this allows peeking into our service's local network, prevent this
	const feedUrl = req.query['mergedWith']
	if (!feedUrl) return next('route')

	const mergedEntities = await mergeFeedEntitiesWithForeignFeed(entities, feedUrl)
	const mergedFeed = encodeFeed(mergedEntities)
	logger.debug({
		feedUrl,
		nrOfEntities: mergedEntities.length,
		feedSize: mergedFeed.length,
	}, 'merged with foreign feed')

	// This is ugly but sufficient for our mergedWith prototype.
	const {setFeed, serveFeed} = createServeFeed()
	setFeed(mergedFeed)
	serveFeed(req, res, (err) => {
		if (err) next(err)
	})
})

api.use('/feed', serveFeed)
