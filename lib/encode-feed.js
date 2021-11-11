import * as gtfsRt from './gtfs-rt-stationupdate-draft.pbf.cjs'

export const FeedMessage = gtfsRt.default.transit_realtime.FeedMessage

export const encodeFeed = (entities) => {
	const feed = {
		header: {
			gtfs_realtime_version: '2.0',
			incrementality: 0,
			timestamp: Date.now() / 1000 | 0,
		},
		entity: entities,
	}

	FeedMessage.verify(feed)
	return FeedMessage.encode(feed).finish()
}
