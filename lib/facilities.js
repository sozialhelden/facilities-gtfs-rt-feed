import {EventEmitter} from 'events'
import fetch from 'node-fetch'
import {logger} from './logger.js'
import {withSoftExit} from './soft-exit.js'

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

	return body.features.map((fa) => ({
		id: fa.properties._id,
		pathwayId: fa.properties._id,
		isWorking: fa.properties.isWorking,
	}))
}

const fetchPeriodically = async () => {
	try {
		const facilities = await fetchFromAccessibilityCloud()
		facilitiesSource.emit('data', facilities)
	} catch (err) {
		logger.error(err)
		facilitiesSource.emit('error', err)
	} finally {
		timer = setTimeout(fetchPeriodically, FETCH_INTERVAL)
	}
}

let timer = setTimeout(fetchPeriodically, 1000)
withSoftExit(() => {
	clearTimeout(timer)
})
