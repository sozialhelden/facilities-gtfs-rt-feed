import {StationUpdate} from './gtfs-rt-encoding.js'

// This follows the GTFS-Updates proposal.
// see also https://docs.google.com/document/d/1qJOTe4m_a4dcJnvXYt4smYj4QQ1ejZ8CvLBYzDM5IyM/edit#heading=h.ikb23zeppj2n

const {OPERATIONAL, CLOSED} = StationUpdate

export const formatAsPathwayUpdates = (facilities) => {
	return facilities.map((fa, i) => ({
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
}
