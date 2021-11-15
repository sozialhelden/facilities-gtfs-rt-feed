import {ok, strictEqual} from 'assert'
import * as gtfsRt from './gtfs-rt-stationupdate-draft.pbf.cjs'

const FeedHeader = gtfsRt.default.transit_realtime.FeedHeader
export const FeedMessage = gtfsRt.default.transit_realtime.FeedMessage
export const StationUpdate = gtfsRt.default.transit_realtime.StationUpdate

export const encodeFeed = (entities) => {
	const feed = {
		header: {
			gtfs_realtime_version: '2.0',
			incrementality: FeedHeader.Incrementality.FULL_DATASET,
			timestamp: Date.now() / 1000 | 0,
		},
		entity: entities,
	}

	FeedMessage.verify(feed)
	return FeedMessage.encode(feed).finish()
}

export const decodeFeed = (buf) => {
	const feed = FeedMessage.toObject(FeedMessage.decode(buf))

	ok(feed.header, 'missing feed.header')
	strictEqual(
		feed.header.gtfs_realtime_version,
		'2.0',
		'unsupported gtfs_realtime_version',
	)
	strictEqual(
		feed.header.incrementality,
		FeedHeader.Incrementality.FULL_DATASET,
		'unsupported incrementality',
	)
	ok(Array.isArray(feed.entity), 'feed.entity must be an array')

	return feed.entity
}
