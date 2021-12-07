import LRUCache from 'quick-lru'
import {randomBytes} from 'crypto'
import * as _csv from 'csv-stringify'
import {logger} from './logger.js'

const {Stringifier} = _csv.default

// Prefix for `service_id` values in pathway_evolutions.csv & calendar_dates.csv.
// Needs to be configured so that the IDs don't conflict with other feeds.
const SERVICE_IDS_PREFIX = process.env.SERVICE_IDS_PREFIX
	? process.env.SERVICE_IDS_PREFIX
	: (
		(10 + Math.round(Math.random() * 25)).toString(36) // alphabetical
		+ randomBytes(5).toString('hex') // alphanumerical
	)
logger.debug({prefix: SERVICE_IDS_PREFIX}, 'service_id prefix in {pathway_evolutions,calendar_dates}.csv')

const cache = new LRUCache({maxSize: 50})
// This is modeled after gtfs-utils/lib/dates-between.
// https://github.com/public-transport/gtfs-utils/blob/1135cef3ee960d90669a362a573e9334faf79678/lib/dates-between.js
// Note: The computed service dates depend on the timezone in the tFrom & tUntil ISO 8601 strings.
const datesBetween = (tFrom, tUntil) => {
	// todo: assert that tFrom & tUntil are ISO 8601 timestamps
	const signature = [tFrom, tUntil].join('-')
	if (cache.has(signature)) {
		return Array.from(cache.get(signature))
	}

	tFrom = new Date(tFrom)
	tUntil = new Date(tUntil)

	const dates = []
	let t = new Date(tFrom)
	for (let i = 0; t <= tUntil; i++) {
		dates.push(t.toISOString().slice(0, 10))
		t.setUTCDate(t.getUTCDate() + 1)
	}

	cache.set(signature, Array.from(dates)) // don't hold reference to `dates`
	return dates
}

// This follows the GTFS-PathwayEvolutions proposal.
// see also https://docs.google.com/document/d/1qJOTe4m_a4dcJnvXYt4smYj4QQ1ejZ8CvLBYzDM5IyM/edit#heading=h.gwtw39pqilcz

const COLUMNS = [
	'pathway_id',
	'service_id',
	'start_time',
	'end_time',
	'is_closed',
	'direction',
]

// todo: encode calendar_dates.txt

export const formatAsPathwayEvolutions = (facilities) => {
	let calendar_dates = []
	const addService = (tFrom, tUntil, pathwayId) => {
		const dates = datesBetween(tFrom, tUntil)
		const service_id = SERVICE_IDS_PREFIX + '_' + pathwayId

		calendar_dates = [
			...calendar_dates,
			...dates.map(date => ({
				service_id,
				date: date.slice(0, 4) + date.slice(5, 7) + date.slice(8, 10),
				// https://gtfs.org/reference/static#calendar_datestxt
				exception_type: '1', // added
			})),
		]
		return service_id
	}

	const pathway_evolutions = facilities.map((fa, i) => {
		let service_id = null
		if (
			// validate ISO 8601
			fa.notWorkingSince && !Number.isNaN(Date.parse(fa.notWorkingSince))
			&& fa.notWorkingUntil && !Number.isNaN(Date.parse(fa.notWorkingUntil))
		) {
			service_id = addService(fa.notWorkingSince, fa.notWorkingUntil, fa.pathwayId)
		}

		return {
			pathway_id: fa.pathwayId,
			service_id,
			start_time: null, // todo
			end_time: null, // todo
			is_closed: fa.isWorking ? '1' : '0',
			direction: null, // todo: implement this for escalators
		}
	})

	return {
		pathway_evolutions,
		calendar_dates,
	}
}

export const encodeCsv = (columns, rows) => {
	const csv = new Stringifier({
		header: true,
		columns,
		quoted: true,
	})

	// todo: try to optimize this, e.g. using Buffer.concat(bufs)?
	let formatted = csv.stringify(columns, true) + '\n' // wtf
	for (const row of rows) {
		formatted += csv.stringify(row) + '\n'
	}

	return Buffer.from(formatted, 'utf8')
}

export const encodePathwayEvolutionsCsv = (rows) => {
	return encodeCsv(COLUMNS, rows)
}
export const encodeCalendarDatesCsv = (rows) => {
	return encodeCsv([
		'service_id',
		'date',
		'exception_type',
	], rows)
}
