import computeEtag from 'etag'
import {strictEqual as sEqual} from 'assert'
import {createServer, get} from 'http'
import {api} from '../api.js'
import {facilitiesSource, stopPolling} from '../lib/facilities.js'

// don't try to poll the actual data source
stopPolling()

const pGet = (url, opt = {}) => {
	return new Promise((resolve, reject) => {
		let bodyChunks = []
		const req = get(url, {
			timeout: 5 * 1000,
			...opt,
		}, (res) => {
			res.once('error', reject)
			res.on('data', (c) => {
				bodyChunks.push(c)
			})
			res.once('end', () => resolve({
				res,
				body: Buffer.concat(bodyChunks),
			}))
		})
		req.once('error', reject)
	})
}

const assertBasicHeaders = (res, msgPrefix) => {
	sEqual(res.headers['accept-ranges'], 'bytes', msgPrefix + ': invalid "accept-ranges" header')
	sEqual(res.headers['cache-control'], 'public, max-age=0', msgPrefix + ': invalid "cache-control" header')
	sEqual(res.headers['vary'], 'accept-encoding', msgPrefix + ': invalid "vary" header')
}

const runTests = async (server) => {
	const {port} = server.address()
	const baseUrl = `http://localhost:${port}`

	{
		const fetchedAt = Date.parse('2021-11-11T11:11+01:00')
		const lastModified = new Date(fetchedAt).toUTCString()

		facilitiesSource.emit('data', [{
			id: 'foo',
			pathwayId: 'p1',
			isWorking: true,
			lastUpdatedAt: Date.parse('2021-10-10T10:10+01:00'),
		}, {
			id: 'bar',
			pathwayId: 'p2',
			isWorking: false,
			lastUpdatedAt: Date.parse('2021-09-09T09:09+01:00'),
		}], fetchedAt)

		const gtfsRtBody = Buffer.from(`\
0a0d0a03322e30100018b4d8b38c06120e0a02653032080a040a0270311000120e0a02653132080\
a040a0270321000`, 'hex')
		const gtfsRtEtag = computeEtag(gtfsRtBody)

		const pathwayEvolutionsBody = Buffer.from(`\
"pathway_id","service_id","start_time","end_time","is_closed","direction"
"p1",,,,"1",
"p2",,,,"0",
`, 'utf8')
		const pathwayEvolutionsEtag = computeEtag(pathwayEvolutionsBody)

		{
			const {res, body} = await pGet(baseUrl + '/feed', {
				method: 'HEAD',
			})
			assertBasicHeaders(res, 'HEAD /feed')
			sEqual(res.headers['content-type'], 'application/octet-stream', 'HEAD /feed: invalid "content-type" header')
			sEqual(res.headers['last-modified'], lastModified, 'HEAD /feed: invalid "last-modified" header')
			sEqual(res.headers['etag'], gtfsRtEtag, 'HEAD /feed: invalid "etag" header')
			sEqual(res.headers['content-length'], gtfsRtBody.length + '', 'HEAD /feed: invalid "content-length" header')
			sEqual(body.toString(), '', 'HEAD /feed: buffer should be empty')
		}
		{
			const {res, body} = await pGet(baseUrl + '/feed')
			assertBasicHeaders(res, 'GET /feed')
			sEqual(body.toString(), gtfsRtBody.toString(), 'GET /feed body should be equal')
		}

		{
			const {res, body} = await pGet(baseUrl + '/pathway_evolutions.csv', {
				method: 'HEAD',
			})
			assertBasicHeaders(res, 'HEAD /pathway_evolutions.csv')
			sEqual(res.headers['content-type'], 'text/csv', 'HEAD /pathway_evolutions.csv: invalid "content-type" header')
			sEqual(res.headers['last-modified'], lastModified, 'HEAD /pathway_evolutions.csv: invalid "last-modified" header')
			sEqual(res.headers['etag'], pathwayEvolutionsEtag, 'HEAD /pathway_evolutions.csv: invalid "etag" header')
			sEqual(res.headers['content-length'], pathwayEvolutionsBody.length + '', 'HEAD /pathway_evolutions.csv: invalid "content-length" header')
			sEqual(body.toString(), '', 'HEAD /pathway_evolutions.csv: buffer should be empty')
		}
		{
			const {res, body} = await pGet(baseUrl + '/pathway_evolutions.csv')
			assertBasicHeaders(res, 'GET /pathway_evolutions.csv')
			sEqual(body.toString(), pathwayEvolutionsBody.toString(), 'GET /pathway_evolutions.csv: body should be equal')
		}
	}

	console.error('looks good ✔︎')
}

const abortWithError = (err) => {
	console.error(err)
	process.exit(1)
}

const server = createServer(api)
server.listen((err) => {
	if (err) abortWithError(err)

	runTests(server)
	.then(() => {
		server.close()
	}, abortWithError)
})
