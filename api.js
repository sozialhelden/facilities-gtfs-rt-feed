'use strict'

import createCors from 'cors'

const cors = createCors()

export const api = (req, res) => {
	cors(req, res, (err) => {
		if (err) {
			res.statusCode = err.statusCode || 500
			res.end(err + '')
			return;
		}

		// todo
	})
}
