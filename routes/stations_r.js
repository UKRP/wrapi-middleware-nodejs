const express = require("express");
const router = express.Router();

const DataManager = require("../managers/data_m");
const dataManager = new DataManager().getInstance();

const logger = require("../logger");

/*
 *	Middleware which check if Station Manager finished to load station from WRAPI
 */
function dataLoaded(req, res, next) {
	let stations_m = dataManager.getStationsManager();
	if (stations_m && stations_m.loaded()) {
		next();
	} else {
		res.status(425).send("Server loading. Please retry later.");
	}
}

/*
 *	Middleware which check RPUID(S) params validity
 */
function validRpuids(req, res, next) {
	if (req.params.rpuids || req.params.rpuid) {
		let stations_m = dataManager.getStationsManager();
		let rpuids = req.params.rpuids ? req.params.rpuids.split(",") : [req.params.rpuid];
		if (rpuids.every((rpuid) => !isNaN(rpuid)) && rpuids.some((rpuid) => stations_m.radioExist(rpuid))) {
			next();
		} else {
			res.status(404).send("Station doesn't exist.");
		}
	} else {
		res.status(404).send("Station doesn't exist.");
	}
}

/*
 *	Middleware which check pagination query validity
 */
function validPagination(req, res, next) {
	if ((!req.page || !isNaN(req.page)) && (!req.size || !isNaN(req.size))) {
		next();
	} else {
		res.status(400).send("Bad Request.");
	}
}

/*
 *	Returns a list of all information on all stations, unless filtered by parameters.
 *	Also provides the ability to search for stations in a number of ways including keyword searching,
 *	category searching, search by bearers and search for local station.
 *	WRAPI URL: https://api.radioplayer.org/v2/stations
 *	Call Reference : https://developers.radioplayer.org/api-reference/stations-1.1.html#return-all-stations
 */
router.get("/", dataLoaded, async function (req, res) {
	try {
		let query = req.query;
		if (
			!Object.keys(query).length ||
			(query.country &&
				((query.search && !query.geo && !query.bearerId) ||
					(query.geo &&
						query.geo.split(",").every((coo) => !isNaN(coo)) &&
						!query.search &&
						!query.bearerId))) ||
			(query.bearerId && !query.search && !query.geo) ||
			(!query.search && !query.bearerId && !query.geo && (query.include || query.country || query.sort))
		) {
			res.send(await dataManager.getStationsManager().getAllStations(query));
		} else {
			res.status(400).send("Bad Request.");
		}
	} catch (error) {
		if (error.statusCode) res.status(error.statusCode).send("WRAPI error.");
		else {
			logger.error("An error occured on /stations.", error);
			res.status(500).send("Server error.");
		}
	}
});

/*
 *	Returns information on a particular station, identified by its rpuid.
 *	WRAPI URL: https://api.radioplayer.org/v2/stations/{rpuids}
 *	Call Reference : https://developers.radioplayer.org/api-reference/stations-by-rpuid-1.1.html#returns-data-about-one-or-more-specified-stations
 */
router.get("/:rpuids", dataLoaded, validRpuids, function (req, res) {
	try {
		res.send(dataManager.getStationsManager().getStations(req.params.rpuids, req.query));
	} catch (error) {
		if (error.statusCode) res.status(error.statusCode).send("WRAPI error.");
		else {
			logger.error("An error occured on /stations/:rpuids.", error);
			res.status(500).send("Server error.");
		}
	}
});

/*
 *	Provides current “track now playing” information from one or multiple radio stations.
 *	WRAPI URL: https://api.radioplayer.org/v2/stations/{rpuids}/onair
 *	Call Reference : https://developers.radioplayer.org/api-reference/stations-rpuids-onair-1.1.html#retrieve-on-air-now-playing-events-from-specified-stations
 */
router.get("/:rpuids/onair", dataLoaded, validRpuids, async function (req, res) {
	try {
		res.send(await dataManager.getStationsManager().getOnAirStations(req.params.rpuids, req.query));
	} catch (error) {
		if (error.statusCode) res.status(error.statusCode).send("WRAPI error.");
		else {
			logger.error("An error occured on /stations/:rpuids/onair.", error);
			res.status(500).send("Server error.");
		}
	}
});

/*
 *	Returns programme schedules for up to five radio stations.
 *	WRAPI URL: https://api.radioplayer.org/v2/stations/{rpuids}/schedule
 *	Call Reference : https://developers.radioplayer.org/api-reference/stations-rpuids-schedule-1.2.html#retrieve-schedules-for-one-or-more-stations
 */
router.get("/:rpuids/schedule", dataLoaded, validRpuids, validPagination, async function (req, res) {
	try {
		if (!req.from == !req.to) {
			res.send(await dataManager.getStationsManager().getScheduleStationsPrograms(req.params.rpuids, req.query));
		} else {
			res.status(400).send("Bad Request.");
		}
	} catch (error) {
		if (error.statusCode) res.status(error.statusCode).send("WRAPI error.");
		else {
			logger.error("An error occured on /stations/:rpuids/schedule.", error);
			res.status(500).send("Server error.");
		}
	}
});

/*
 *	Returns a list of on-demand items for a given radio station.
 *	WRAPI URL: https://api.radioplayer.org/v2/stations/{rpuids}/ondemand
 *	Call Reference : ???
 */
router.get("/:rpuid/ondemand", dataLoaded, validRpuids, validPagination, async function (req, res) {
	try {
		res.send(await dataManager.getStationsManager().getOnDemand(req.params.rpuid, req.query));
	} catch (error) {
		if (error.statusCode) res.status(error.statusCode).send("WRAPI error.");
		else {
			logger.error("An error occured on /stations/:rpuids/ondemand.", error);
			res.status(500).send("Server error.");
		}
	}
});

/*
 *	Returns a list of on-demand content for a given series.
 *	WRAPI URL: https://api.radioplayer.org/v2/stations/{rpuids}/ondemand/{seriesId}
 *	Call Reference : https://developers.radioplayer.org/api-reference/stations-rpuids-ondemand-seriesid-1.1.html#retrieve-recent-on-demand-content-as-part-of-a-series
 */
router.get("/:rpuid/ondemand/:seriesId", dataLoaded, validRpuids, validPagination, async function (req, res) {
	try {
		res.send(await dataManager.getStationsManager().getOnDemand(req.params.rpuid, req.query, req.params.seriesId));
	} catch (error) {
		if (error.statusCode) res.status(error.statusCode).send("WRAPI error.");
		else {
			logger.error("An error occured on /stations/:rpuids/ondemand/:seriesId.", error);
			res.status(500).send("Server error.");
		}
	}
});

module.exports = router;
