const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const tools = require('../tools');
const RecommendationsC = require('../controllers/recommendations_c');

/*
 *  Shows recommended content based on station affinity, music preferences from social media such as facebook,
 *  geolocation and generally trending stations.
 *	WRAPI URL: https://api.radioplayer.org/v2/recommendations
 *	Call Reference : https://developers.radioplayer.org/api-reference/recommendations-1.0.html#return-recommendations-for-radio-stations
 */
router.post(
	'/',
	[
		body('country').isInt({ min: 0 }).withMessage('Invalid country format'),
		body('factors').isArray({ min: 1 }).withMessage('Invalid factors format'),
		body('factors.*')
			.isIn(['GEO', 'TRENDING', 'AFFINITY', 'ONDEMAND', 'MUSICMATCH'])
			.withMessage('Invalid factors elements format'),
		body('rpuid').optional().isInt({ min: 0 }).withMessage('Invalid rpuid format'),
		body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude format'),
		body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude format'),
	],
	tools.requestErrorHandler,
	RecommendationsC.postRecommendation,
);

module.exports = router;
