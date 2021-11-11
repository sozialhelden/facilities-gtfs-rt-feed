'use strict'

import pino from 'pino'

import {createRequire} from 'module'
const require = createRequire(import.meta.url)
// Node.js currently only allows importing JSON files with --experimental-json-modules,
// so we use require() here.
const pkg = require('../package.json')

export const logger = pino({
	name: pkg.name,
	level: process.env.LOG_LEVEL || 'info',
})
