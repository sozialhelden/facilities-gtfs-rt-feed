'use strict'

import computeEtag from 'etag'
import serveBuffer from 'serve-buffer'

export const createServeBufferCompressed = (serveBufferOpts = {}) => {
	let buf = Buffer.alloc(0)
	let timeModified = new Date()
	let etag = computeEtag(buf)

	// todo: throttle this by 100ms?
	const setBuffer = (newBuf, newTimeModified = Date.now()) => {
		buf = newBuf
		timeModified = new Date(newTimeModified)
		etag = computeEtag(buf)
	}

	const serveBufferCompressed = (req, res, cb = () => {}) => {
		serveBuffer(req, res, buf, {
			...serveBufferOpts,
			timeModified, etag,
			gzipMaxSize: 20 * 1024 * 1024, // 20mb
			brotliCompressMaxSize: 1024 * 1024, // 1mb
			unmutatedBuffers: true,
		}, cb)
	}

	return {
		setBuffer,
		serveBufferCompressed,
	}
}
