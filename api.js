'use strict'

import createCors from 'cors'
import express from 'express'
import {createServeBufferCompressed} from './lib/serve-buffer-compressed.js'
import {encodeFeed as encodeGtfsRtFeed} from './lib/gtfs-rt-encoding.js'
import {formatAsPathwayUpdates} from './lib/pathway-updates-encoding.js'
import {
	formatAsPathwayEvolutions,
	encodeCsv as encodePathwayEvolutions,
} from './lib/pathway-evolutions-encoding.js'
import {facilitiesSource} from './lib/facilities.js'
import {mergeFeedEntitiesWithForeignFeed} from './lib/merge-with-foreign-feed.js'
import {logger} from './lib/logger.js'
import {handleMetricsRequest} from './lib/metrics.js'

const {
	setBuffer: setGtfsRtFeed,
	serveBufferCompressed: serveGtfsRtFeed,
} = createServeBufferCompressed()

let pathwayUpdates = []
let gtfsRtFeed = encodeGtfsRtFeed(pathwayUpdates)
setGtfsRtFeed(gtfsRtFeed)
facilitiesSource.on('data', (facilities, fetchedAt) => {
	pathwayUpdates = formatAsPathwayUpdates(facilities)
	gtfsRtFeed = encodeGtfsRtFeed(pathwayUpdates, fetchedAt)
	setGtfsRtFeed(gtfsRtFeed, fetchedAt)
	logger.debug({
		nrOfFacilities: facilities.length,
		feedSize: gtfsRtFeed.length,
	}, 'generated unmerged GTFS-RT feed')
})

const {
	setBuffer: setPathwayEvolutions,
	serveBufferCompressed: servePathwayEvolutions,
} = createServeBufferCompressed({
	// https://datatracker.ietf.org/doc/html/rfc4180#section-3
	contentType: 'text/csv',
})

facilitiesSource.on('data', (facilities, fetchedAt) => {
	const pathwayEvolutions = formatAsPathwayEvolutions(facilities)
	const pathwayEvolutionsFile = encodePathwayEvolutions(pathwayEvolutions)
	setPathwayEvolutions(pathwayEvolutionsFile, fetchedAt)
	logger.debug({
		nrOfPathwayEvolutions: pathwayEvolutions.length,
		fileSize: pathwayEvolutionsFile.length,
	}, 'generated pathway_evolutions.txt')
})

export const api = express()
api.use(createCors())

// todo: serve explainer page at /

api.use('/feed', async (req, res, next) => {
	// todo: this allows peeking into our service's local network, prevent this
	const feedUrl = req.query['mergedWith']
	if (!feedUrl) return next('route')

	const mergedEntities = await mergeFeedEntitiesWithForeignFeed(pathwayUpdates, feedUrl)
	const mergedFeed = encodeGtfsRtFeed(mergedEntities)
	logger.debug({
		feedUrl,
		nrOfEntities: mergedEntities.length,
		feedSize: mergedFeed.length,
	}, 'merged with foreign GTFS-RT feed')

	// This is ugly but sufficient for our mergedWith prototype.
	const {
		setBuffer: setFeed,
		serveBufferCompressed: serveFeed,
	} = createServeBufferCompressed()
	setFeed(mergedFeed)
	serveFeed(req, res, (err) => {
		if (err) next(err)
	})
})

api.use('/feed', serveGtfsRtFeed)

// todo: serve extended calendar.txt/calendar_dates.txt file
api.use('/pathway_evolutions.txt', servePathwayEvolutions)
api.use('/pathway_evolutions.csv', servePathwayEvolutions)

api.use('/metrics', handleMetricsRequest)
