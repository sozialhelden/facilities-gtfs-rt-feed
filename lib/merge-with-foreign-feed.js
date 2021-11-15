import fetch from 'node-fetch'
import {logger} from './logger.js'
import {decodeFeed} from './encoding.js'

import {createRequire} from 'module'
const require = createRequire(import.meta.url)
// Node.js currently only allows importing JSON files with --experimental-json-modules,
// so we use require() here.
const pkg = require('../package.json')

const USER_AGENT = process.env.FOREIGN_FEED_USER_AGENT || pkg.repo

// Note: This merging logic (decode, concatenate, encode) is inherently
// flawed, because it drops all extensions (https://developers.google.com/transit/gtfs-realtime/guides/extensions)
// used by the foreign feed.
export const mergeFeedEntitiesWithForeignFeed = async (entities, feedUrl) => {
	const res = await fetch(feedUrl, {
		redirect: 'follow',
		headers: {
			'user-agent': USER_AGENT,
			// we follow https://github.com/opentripplanner/OpenTripPlanner/pull/2797 here
			'accept': 'application/x-google-protobuf; application/octet-stream; */*',
		},
	})
	if (!res.ok) {
		const err = new Error(`fetching foreign GTFS-RT feed failed: ${res.statusText}`)
		err.statusCode = res.status
		err.feedUrl = res.feedUrl
		throw err
	}

	// todo: abort after a certain size!
	const t0 = Date.now()
	const foreignFeed = Buffer.from(await res.arrayBuffer())
	const foreignEntities = decodeFeed(foreignFeed)
	logger.debug({
		responseTime: Date.now() - t0,
	}, 'fetched foreign feed')

	return [
		...foreignEntities,
		...entities,
	]
}
