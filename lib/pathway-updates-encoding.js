import {StationUpdate} from './gtfs-rt-encoding.js'

// This follows the GTFS-Updates proposal.
// see also https://docs.google.com/document/d/1qJOTe4m_a4dcJnvXYt4smYj4QQ1ejZ8CvLBYzDM5IyM/edit#heading=h.ikb23zeppj2n

const {OPERATIONAL, CLOSED} = StationUpdate

// todo: generate `Alert`s [1][2] targeting the stop and/or pathway via `informed_entity`
// Currently, because `informed_entity` is an `EntitySelector` [3][4], it can only target
// entire stops, not pathways specifically.
// However, creating alerts about whole stops whenever one elevator/escalator fails seems
// a bit noisy: It would allow routing engines' logic determining which alerts to show to
// be very simple, but it also generate many false positives.
// By creating alerts about pathways specifically, routing engines would have to support
// pathways and find alerts for them, so we would expect greater complexity from
// consumers. Also, we would have to modify the GTFS-RT schema even further, adding a
// `pathway_id` field to `EntitySelector` [3][4].
// Another option would be to generate *both* stop-specific and pathways-specific alerts,
// decreasing the required consumer complexity, but potentially spamming users with
// duplicate alerts. Also, another problem would arise: Currently, a `StationUpdate` [5]
// can only reference *one* `Alert`.
// [1] https://gtfs.org/reference/realtime/v2/#message-alert
// [2] https://developers.google.com/transit/gtfs-realtime/reference/#message-alert
// [3] https://gtfs.org/reference/realtime/v2/#message-entityselector
// [4] https://developers.google.com/transit/gtfs-realtime/reference/#message-entityselector
// [5] https://docs.google.com/document/d/1qJOTe4m_a4dcJnvXYt4smYj4QQ1ejZ8CvLBYzDM5IyM/edit#heading=h.bahelfxmdkny

export const formatAsPathwayUpdates = (facilities) => {
	return facilities.map((fa, i) => ({
		id: `e${i}`,
		station_update: {
			pathway: [{
				pathway_id: fa.pathwayId,
			}],
			status: fa.isWorking ? OPERATIONAL : CLOSED,
			// todo: alert_id (see above)
			// todo: direction
			// todo: elevator metadata as pbf extension
		},
	}))
}
