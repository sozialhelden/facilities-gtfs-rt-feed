'use strict'

import createCors from 'cors'
import express from 'express'
import {createServeBufferCompressed} from './lib/serve-buffer-compressed.js'
import {encodeFeed as encodeGtfsRtFeed} from './lib/gtfs-rt-encoding.js'
import {formatAsPathwayUpdates} from './lib/pathway-updates-encoding.js'
import {
	formatAsPathwayEvolutions,
	encodePathwayEvolutionsCsv,
	encodeCalendarDatesCsv,
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
const {
	setBuffer: setCalendarDates,
	serveBufferCompressed: serveCalendarDates,
} = createServeBufferCompressed({
	// https://datatracker.ietf.org/doc/html/rfc4180#section-3
	contentType: 'text/csv',
})

facilitiesSource.on('data', (facilities, fetchedAt) => {
	const {
		pathway_evolutions,
		calendar_dates,
	} = formatAsPathwayEvolutions(facilities)

	const pathwayEvolutionsFile = encodePathwayEvolutionsCsv(pathway_evolutions)
	setPathwayEvolutions(pathwayEvolutionsFile, fetchedAt)
	logger.debug({
		nrOfRows: pathway_evolutions.length,
		fileSize: pathwayEvolutionsFile.length,
	}, 'generated pathway_evolutions.txt')

	const calendarDatesFile = encodeCalendarDatesCsv(calendar_dates)
	setCalendarDates(calendarDatesFile, fetchedAt)
	logger.debug({
		nrOfRows: calendar_dates.length,
		fileSize: calendarDatesFile.length,
	}, 'generated calendar_dates.txt')
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

api.use('/pathway_evolutions.txt', (req, res) => {
	res.redirect(301, '/pathway_evolutions.csv')
})
api.use('/pathway_evolutions.csv', servePathwayEvolutions)
api.use('/calendar_dates.txt', (req, res) => {
	res.redirect(301, '/calendar_dates.csv')
})
api.use('/calendar_dates.csv', serveCalendarDates)

api.use('/metrics', handleMetricsRequest)

api.use((err, req, res, next) => {
	if (err.code === 'ERR_STREAM_PREMATURE_CLOSE') return;
	logger.error(err)
	next(err)
})
