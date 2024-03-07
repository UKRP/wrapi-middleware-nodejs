const { validationResult } = require('express-validator');

exports.requestErrorHandler = (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		} else next();
	} catch (error) {
		res.status(500).send('Internal error');
	}
};
