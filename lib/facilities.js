import {EventEmitter} from 'events'
import fetch from 'node-fetch'
import {inspect} from 'util'
import {logger} from './logger.js'
import {withSoftExit} from './soft-exit.js'
import {metrics} from './metrics.js'

import {createRequire} from 'module'
const require = createRequire(import.meta.url)
// Node.js currently only allows importing JSON files with --experimental-json-modules,
// so we use require() here.
const pkg = require('../package.json')

const ACCESSIBILITY_CLOUD_TOKEN = process.env.ACCESSIBILITY_CLOUD_TOKEN
if (!ACCESSIBILITY_CLOUD_TOKEN) {
	console.error('Missing/empty ACCESSIBILITY_CLOUD_TOKEN environment variable.')
	process.exit(1)
}

const FETCH_INTERVAL = process.env.FACILITIES_FETCH_INTERVAL
	? parseInt(process.env.FACILITIES_FETCH_INTERVAL)
	: 10 * 1000

// We currently assume no more than 10k facilities.
const ACCESSIBILITY_CLOUD_ENDPOINT = 'https://v2.accessibility.cloud/equipment-infos.json?reduceHeaders=1&limit=10000'

export const facilitiesSource = new EventEmitter()
facilitiesSource.on('data', (facilities) => {
	logger.trace({facilities}, 'updated facilities')
})

const accessibilityCloudResponseTime = new metrics.Histogram({
	name: 'accessibility_cloud_response_time_seconds',
	help: 'accessibility.cloud API response time',
})
const nrOfFacilities = new metrics.Gauge({
	name: 'nr_of_facilities',
	help: 'nr. of facilities returned by the accessibility.cloud API',
})

export const parseAccessibilityCloudResponse = (body) => {
	return body.features.map((fa) => ({
		id: fa.properties._id,
		pathwayId: fa.properties._id,
		isWorking: fa.properties.isWorking,
		lastUpdatedAt: fa.properties.lastUpdate && Date.parse(fa.properties.lastUpdate) / 1000 | 0,
		notWorkingSince: fa.properties.notWorkingSince || null,
		notWorkingUntil: fa.properties.notWorkingUntil || null,
	}))
}

const fetchFromAccessibilityCloud = async () => {
	const url = new URL(ACCESSIBILITY_CLOUD_ENDPOINT)
	url.searchParams.set('appToken', ACCESSIBILITY_CLOUD_TOKEN)
	const res = await fetch(url.href, {
		headers: {
			'accept': 'application/json',
			'user-agent': pkg.name,
		},
		redirect: 'follow',
	})

	if (!res.ok) {
		const err = new Error(`fetching facilities from accessibility.cloud failed: ${res.statusText}`)
		err.statusCode = res.status
		err.url = url.href
		throw err
	}
	const body = await res.json()

	return parseAccessibilityCloudResponse(body)
}

const fetchPeriodically = async () => {
	try {
		const t0 = Date.now()

		const resTime = accessibilityCloudResponseTime.startTimer()
		const facilities = await fetchFromAccessibilityCloud()
		accessibilityCloudResponseTime.observe(resTime())
		nrOfFacilities.set(facilities.length)

		logger.trace(`facilities: ${inspect(facilities)}`)
		facilitiesSource.emit('data', facilities, t0)
	} catch (err) {
		logger.error(err)
		facilitiesSource.emit('error', err)
	} finally {
		timer = setTimeout(fetchPeriodically, FETCH_INTERVAL)
	}
}

let timer = null
export const startPolling = () => {
	if (timer !== null) return;
	timer = setTimeout(fetchPeriodically, 1000)
}
export const stopPolling = () => {
	if (timer === null) return;
	clearTimeout(timer)
	timer = null
}

withSoftExit(stopPolling)
startPolling()
