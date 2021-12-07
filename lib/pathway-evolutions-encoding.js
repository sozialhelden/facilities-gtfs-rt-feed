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
		pathway_id: fa.pathwayId,
		service_id: null, // todo
		start_time: null, // todo
		end_time: null, // todo
		is_closed: fa.isWorking ? '1' : '0',
		direction: null,
	}))
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
