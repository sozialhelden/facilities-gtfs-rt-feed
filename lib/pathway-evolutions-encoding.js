import * as _csv from 'csv-stringify'

const {Stringifier} = _csv.default

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
	return facilities.map((fa, i) => ({
		pathway_id: fa.properties.pathwayId,
		service_id: null, // todo
		start_time: null, // todo
		end_time: null, // todo
		is_closed: fa.properties.isWorking ? '1' : '0',
		direction: null,
	}))
}

export const encodeCsv = (pathwayEvolutions) => {
	const csv = new Stringifier({
		header: true,
		columns: COLUMNS,
		quoted: true,
	})

	// todo: try to optimize this, e.g. using Buffer.concat(bufs)?
	let formatted = ''
	for (const row of pathwayEvolutions) {
		formatted += csv.stringify(row) + '\n'
	}

	return Buffer.from(formatted, 'utf8')
}
