'use strict'

import computeEtag from 'etag'
import {gzipSync, brotliCompressSync} from 'zlib'
import serveBuffer from 'serve-buffer'

export const createServeFeed = () => {
	let feed = Buffer.alloc(0)
	let timeModified = new Date()
	let etag = computeEtag(feed)

	// todo: throttle this by 100ms?
	const setFeed = (newFeed, newTimeModified = Date.now()) => {
		feed = newFeed
		timeModified = new Date(newTimeModified)
		etag = computeEtag(feed)
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

	const serveFeed = (req, res) => {
		serveBuffer(req, res, feed, {
			timeModified, etag,
			gzip: compression(gzipSync, 'gzip'),
			brotliCompress: compression(brotliCompressSync, 'brotli'),
		})
	}

	return {
		setFeed,
		serveFeed,
	}
}
