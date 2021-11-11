import {EventEmitter} from 'events'

export const facilitiesSource = new EventEmitter()

// todo: fetch from actual DB periodically

const mockElevators = [{
	// todo: proper mock data
	id: 'a',
	properties: {
		stopId: 'one',
		pathwayId: '1',
		isWorking: true,
	},
}, {
	id: 'b',
	properties: {
		stopId: 'two',
		pathwayId: '2',
		isWorking: false,
	},
}]

setInterval(() => {
	facilitiesSource.emit('data', mockElevators)
}, 10 * 1000) // 10s
