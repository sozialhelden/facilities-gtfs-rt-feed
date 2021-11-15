'use strict'

import computeEtag from 'etag'
import {gzipSync, brotliCompressSync} from 'zlib'
import serveBuffer from 'serve-buffer'

// todo: simplify once https://github.com/derhuerst/serve-buffer/issues/2 is implemented
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

	const compression = (compress, compression) => {
		// note: this is assumes that `buf` is not mutated
		const cache = new WeakMap()
		return buf => {
			if (cache.has(buf)) return cache.get(buf)
			const compressedBuffer = compress(buf)
			const compressedEtag = computeEtag(compressedBuffer)
			const res = {compressedBuffer, compressedEtag}
			cache.set(buf, res)
			return res
		}
	}
	const cachedGzip = compression(gzipSync, 'gzip')
	const cachedBrotliCompress = compression(brotliCompressSync, 'brotli')

	const serveBufferCompressed = (req, res, cb = () => {}) => {
		serveBuffer(req, res, buf, {
			...serveBufferOpts,
			timeModified, etag,
			gzip: cachedGzip,
			brotliCompress: cachedBrotliCompress,
		}, cb)
	}

	return {
		setBuffer,
		serveBufferCompressed,
	}
}
