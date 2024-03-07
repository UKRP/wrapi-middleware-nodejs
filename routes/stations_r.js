const express = require('express');
const router = express.Router();
const { query, param } = require('express-validator');

const DataManager = require('../managers/data_m');
const dataManager = new DataManager().getInstance();

const StationsC = require('../controllers/stations_c');

const tools = require('../tools');

/*
 *	Middleware which check if Station Manager finished to load station from WRAPI
 */
function dataLoaded(req, res, next) {
	try {
		if (dataManager.getStationsObject()) {
			next();
		} else {
			res.status(425).send('Server loading. Please retry later.');
		}
	} catch (error) {
		res.status(500).send('Internal error');
	}
}

/*
 *	Middleware which check RPUID(S) params validity
 */
function validRpuids(req, res, next) {
	try {
		if (req.params.rpuids || req.params.rpuid) {
			const rpuids = req.params.rpuids ? req.params.rpuids.split(',') : [req.params.rpuid];
			if (rpuids.every((rpuid) => !isNaN(rpuid)) && rpuids.every((rpuid) => StationsC.radioExist(rpuid))) {
				next();
			} else {
				res.status(404).send("Station doesn't exist.");
			}
		} else {
			res.status(404).send("Station doesn't exist.");
		}
	} catch (error) {
		res.status(500).send('Internal error');
	}
}

/*
 *	Middleware which check pagination query validity
 */
function validPagination(req, res, next) {
	try {
		if ((!req.page || !isNaN(req.page)) && (!req.size || !isNaN(req.size))) {
			next();
		} else {
			res.status(400).send('Bad Request.');
		}
	} catch (error) {
		res.status(500).send('Internal error');
	}
}

/*
 *	Returns a list of all information on all stations, unless filtered by parameters.
 *	Also provides the ability to search for stations in a number of ways including keyword searching,
 *	category searching, search by bearers and search for local station.
 *	WRAPI URL: https://api.radioplayer.org/v2/stations
 *	Call Reference : https://developers.radioplayer.org/api-reference/stations-1.1.html#return-all-stations
 */
router.get(
	'/',
	[
		query('country').optional().isInt({ min: 0 }).withMessage('Invalid country format'),
		query('bearerId').optional().isString({ min: 1 }).withMessage('Invalid bearerId format'),
		query('search').optional().isString({ min: 1 }).withMessage('Invalid search format'),
		query('geo').optional().isLatLong().withMessage('Invalid geo format'),
		query('sort').optional().isString({ min: 1 }).withMessage('Invalid sort format'),
		query('include')
			.optional()
			.custom(async (value) => {
				const splittedValue = value.split(',');
				const possibleValues = ['ids', 'detail', 'bearers', 'social', 'streams', 'images'];
				if (!splittedValue.every((one) => possibleValues.includes(one.trim())))
					throw new Error(
						'Invalid include format. Available values are ids/detail/bearers/social/streams/images. Serapated by comma if multiple values.',
					);
			}),
	],
	tools.requestErrorHandler,
	StationsC.getStations,
);

/*
 *	Returns information on a particular station, identified by its rpuid.
 *	WRAPI URL: https://api.radioplayer.org/v2/stations/{rpuids}
 *	Call Reference : https://developers.radioplayer.org/api-reference/stations-by-rpuid-1.1.html#returns-data-about-one-or-more-specified-stations
 */
router.get('/:rpuids', dataLoaded, validRpuids, StationsC.getStationsByRpuids);

/*
 *	Provides current “track now playing” information from one or multiple radio stations.
 *	WRAPI URL: https://api.radioplayer.org/v2/stations/{rpuids}/onair
 *	Call Reference : https://developers.radioplayer.org/api-reference/stations-rpuids-onair-1.1.html#retrieve-on-air-now-playing-events-from-specified-stations
 */
router.get('/:rpuids/onair', dataLoaded, validRpuids, StationsC.getOnAir);

/*
 *	Returns programme schedules for up to five radio stations.
 *	WRAPI URL: https://api.radioplayer.org/v2/stations/{rpuids}/schedule
 *	Call Reference : https://developers.radioplayer.org/api-reference/stations-rpuids-schedule-1.2.html#retrieve-schedules-for-one-or-more-stations
 */
router.get('/:rpuids/schedule', dataLoaded, validRpuids, validPagination, StationsC.getPrograms);

/*
 *	Returns a list of on-demand items for a given radio station.
 *	WRAPI URL: https://api.radioplayer.org/v2/stations/{rpuids}/ondemand
 *	Call Reference : ???
 */
router.get(
	'/:rpuid/ondemand',
	[param('rpuid').isInt({ min: 0 }).withMessage('Invalid rpuid format')],
	tools.requestErrorHandler,
	dataLoaded,
	validRpuids,
	validPagination,
	StationsC.getOnDemand,
);

/*
 *	Returns a list of on-demand content for a given series.
 *	WRAPI URL: https://api.radioplayer.org/v2/stations/{rpuids}/ondemand/{seriesId}
 *	Call Reference : https://developers.radioplayer.org/api-reference/stations-rpuids-ondemand-seriesid-1.1.html#retrieve-recent-on-demand-content-as-part-of-a-series
 */
router.get(
	'/:rpuid/ondemand/:seriesId',
	[param('rpuid').isInt({ min: 0 }).withMessage('Invalid rpuid format')],
	tools.requestErrorHandler,
	dataLoaded,
	validRpuids,
	validPagination,
	StationsC.getOnDemand,
);

module.exports = router;
