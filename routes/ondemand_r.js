const express = require('express');
const router = express.Router();
const { query } = require('express-validator');

const OnDemandsC = require('../controllers/ondemands_c');

const tools = require('../tools');

/*
 *  Returns details on all pieces of on-demand content, unless filtered by parameters which include text searching,
 *  filtering by category, country or station.
 *	WRAPI URL: https://api.radioplayer.org/v2/ondemand
 *	Call Reference : https://developers.radioplayer.org/api-reference/ondemand-1.0.html#search-for-and-retrieve-on-demand-content
 */
router.get(
	'/',
	[
		query('country').isInt({ min: 0 }).withMessage('Invalid country format'),
		query('page').optional().isInt({ min: 1 }).withMessage('Invalid page format'),
		query('size').optional().isInt({ min: 1 }).withMessage('Invalid size format'),
	],
	tools.requestErrorHandler,
	OnDemandsC.getOnDemands,
);

/*
 *	Returns all information on a particular piece of on-demand content, identified by its OD ID.
 *	WRAPI URL: https://api.radioplayer.org/v2/ondemand/{odIds}
 *	Call Reference : https://developers.radioplayer.org/api-reference/ondemand-odIds-1.0.html#retrieve-on-demand-content-using-its-unique-id
 */
router.get('/:odIds', OnDemandsC.getOnDemandByIds);

module.exports = router;
