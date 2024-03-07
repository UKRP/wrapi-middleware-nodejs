const DataManager = require('../managers/data_m');
const dataManager = new DataManager().getInstance();
const Station = require('../models/station');
const Response = require('../models/response');

const logger = require('../logger');

async function updateStations() {
	try {
		// Download all stations from WRAPI and map them
		const stations = await dataManager.getWrapi().getStations({});
		if (stations.error) throw stations.error;
		dataManager.setCountriesWhiteList([...new Set(stations.data.map((station) => Number(station.country)))]);
		dataManager.setStationsArray(stations.data.map((station) => new Station(station)));

		const stationsObj = {};
		for (let stationRpuid in stations.data) {
			stationsObj[stations.data[stationRpuid].rpuid] = new Station(stations.data[stationRpuid]);
		}
		const currentStationsObj = dataManager.getStationsObject();
		if (currentStationsObj) {
			for (const stationRpuid in stationsObj) {
				if (currentStationsObj[stationRpuid]) {
					stationsObj[stationRpuid].keepExtraData(currentStationsObj[stationRpuid]);
				}
			}
		}
		dataManager.setStationsObject(stationsObj);
		dataManager.setStationsNextUpdate(dataManager.getCachingTimeout('stations', stations.meta.cacheExpiresAt));
		setTimeout(async () => updateStations(), dataManager.getStationsNextUpdate() - new Date().getTime());
	} catch (error) {
		logger.error('An error occured during Stations update.', error);
		setTimeout(async () => updateStations(), 600000);
	}
}
updateStations();

exports.getOnDemand = async (req, res) => {
	const rpuid = req.params.rpuid;
	const country = rpuid.slice(0, 3);
	try {
		const seriesId = req.params.seriesId;
		if (!dataManager.getCountriesWhiteList().includes(Number(country))) {
			return res.status(400).send('Unauthorized country.');
		}
		res.send(await dataManager.getOnDemand(req.query, rpuid, seriesId));
	} catch (error) {
		if (error.statusCode) {
			res.status(error.statusCode).send('WRAPI error.');
		} else {
			logger.error(
				'An error occured on /stations/:rpuids/ondemand' + (seriesId ? '/:seriesId' : '') + '.',
				error,
			);
			res.status(500).send('Server error.');
		}
	}
};

exports.getPrograms = async (req, res) => {
	const rpuids = req.params.rpuids;
	const country = rpuids.slice(0, 3);
	try {
		if (!dataManager.getCountriesWhiteList().includes(Number(country))) {
			return res.status(400).send('Unauthorized country.');
		}
		if (!req.from == !req.to) {
			let answer = [];
			for (let rpuid of rpuids.split(',')) {
				answer.push(await dataManager.getPrograms(req.query, rpuid));
			}
			res.send(new Response(0, answer, {}, 'schedule'));
		} else {
			res.status(400).send('Bad Request.');
		}
	} catch (error) {
		if (error.statusCode) {
			res.status(error.statusCode).send('WRAPI error.');
		} else {
			logger.error('An error occured on /stations/:rpuids/schedule.', error);
			res.status(500).send('Server error.');
		}
	}
};

exports.getStations = async (req, res) => {
	const { country, search, geo, bearerId, include, sort } = req.query;
	try {
		if (country && !dataManager.getCountriesWhiteList().includes(Number(country))) {
			return res.status(400).send('Unauthorized country.');
		}
		if (
			!Object.keys(req.query).length ||
			(country && ((search && !geo && !bearerId) || (geo && !search && !bearerId))) ||
			(bearerId && !search && !geo) ||
			(!search && !bearerId && !geo && (include || country || sort))
		) {
			let stationsToFilter = dataManager.getStationsObject();
			let stations = [];

			// Filter stations by geolocation if parameter filled
			if (geo) {
				const coo = geo.split(',');
				const lat = Math.round(coo[0] * 10);
				const long = Math.round(coo[1] * 10);
				if (!dataManager.getStationsGeolocated(lat, long)) {
					const stations = await dataManager.getWrapi().getStations({ country: country, geo: geo });
					if (stations.error) throw stations.error;
				}
				stationsToFilter = dataManager.getStationsGeolocated(lat, long);
			}

			// Filter stations by include & country & bearerId & search if parameters filled
			for (const stationRpuid in stationsToFilter) {
				if (!Object.keys(req.query).length) {
					stations.push(stationsToFilter[stationRpuid].getData());
				} else {
					if (
						country &&
						stationsToFilter[stationRpuid].data.country !== country &&
						(!search || (search && !stationsToFilter[stationRpuid].contains(search)))
					)
						continue;
					if (bearerId && !stationsToFilter[stationRpuid].gotBearerId(bearerId)) continue;
					const station = include ? {} : stationsToFilter[stationRpuid].getData();
					if (include) {
						// Only keep wanted fields
						station['genres'] = stationsToFilter[stationRpuid].data['genres'];
						station['rpuid'] = stationsToFilter[stationRpuid].data['rpuid'];

						const keysList = include.split(',').map((key) => key.trim());
						for (let key of keysList) {
							if (key == 'detail') {
								station['name'] = stationsToFilter[stationRpuid].data['name'];
								station['description'] = stationsToFilter[stationRpuid].data['description'];
								station['country'] = stationsToFilter[stationRpuid].data['country'];
							} else if (key == 'bearers') {
								station['bearers'] = stationsToFilter[stationRpuid].data['bearers'];
							} else if (key == 'social') {
								station['socialIds'] = stationsToFilter[stationRpuid].data['socialIds'];
							} else if (key == 'liveStreams') {
								station['liveStreams'] = stationsToFilter[stationRpuid].data['liveStreams'];
							} else if (key == 'images') {
								station['multimedia'] = stationsToFilter[stationRpuid].data['multimedia'];
							}
						}
					}
					stations.push(station);
				}
			}

			// Sort list if parameter filled
			if (sort) {
				stations = stations.sort((a, b) => {
					const nameA = a.name.toUpperCase();
					const nameB = b.name.toUpperCase();
					if (nameA < nameB) return -1;
					if (nameA > nameB) return 1;
					return 0;
				});
			}

			res.send(new Response(dataManager.getStationsNextUpdate(), stations, req.query, 'stations'));
		} else {
			res.status(400).send('Bad Request.');
		}
	} catch (error) {
		if (error.statusCode) {
			res.status(error.statusCode).send('WRAPI error.');
		} else {
			logger.error('An error occured on /stations.', error);
			res.status(500).send('Server error.');
		}
	}
};

exports.getStationsByRpuids = async (req, res) => {
	const rpuids = req.params.rpuids;
	const country = rpuids.slice(0, 3);
	try {
		if (!dataManager.getCountriesWhiteList().includes(Number(country))) {
			return res.status(400).send('Unauthorized country.');
		}
		const include = req.query.include;
		let stations = [];
		let stationsToFilter = dataManager.getStationsObject();
		for (const rpuid of rpuids.split(',')) {
			const station = include ? {} : stationsToFilter[rpuid].getData();
			if (include) {
				// Only keep wanted fields
				station['genres'] = stationsToFilter[rpuid].data['genres'];
				station['rpuid'] = stationsToFilter[rpuid].data['rpuid'];

				const keysList = include.split(',').map((key) => key.trim());
				for (let key of keysList) {
					if (key == 'detail') {
						station['name'] = stationsToFilter[rpuid].data['name'];
						station['description'] = stationsToFilter[rpuid].data['description'];
						station['country'] = stationsToFilter[rpuid].data['country'];
					} else if (key == 'bearers') {
						station['bearers'] = stationsToFilter[rpuid].data['bearers'];
					} else if (key == 'social') {
						station['socialIds'] = stationsToFilter[rpuid].data['socialIds'];
					} else if (key == 'liveStreams') {
						station['liveStreams'] = stationsToFilter[rpuid].data['liveStreams'];
					} else if (key == 'images') {
						station['multimedia'] = stationsToFilter[rpuid].data['multimedia'];
					}
				}
			}
			stations.push(station);
		}

		res.send(new Response(dataManager.getStationsNextUpdate(), stations, req.query, 'stations'));
	} catch (error) {
		if (error.statusCode) {
			res.status(error.statusCode).send('WRAPI error.');
		} else {
			logger.error('An error occured on /stations/:rpuids.', error);
			res.status(500).send('Server error.');
		}
	}
};

exports.radioExist = (rpuid) => {
	try {
		return !!dataManager.getStationsObject()[rpuid];
	} catch (error) {
		return false;
	}
};

exports.getOnAir = async (req, res) => {
	const rpuids = req.params.rpuids;
	const country = rpuids.slice(0, 3);
	try {
		if (!dataManager.getCountriesWhiteList().includes(Number(country))) {
			return res.status(400).send('Unauthorized country.');
		}
		const onair = [];
		for (let rpuid of rpuids.split(',')) {
			onair.push(await dataManager.getOnAir(req.query, rpuid));
		}
		res.send(new Response(0, onair, {}, 'onair'));
	} catch (error) {
		if (error.statusCode) {
			res.status(error.statusCode).send('WRAPI error.');
		} else {
			logger.error('An error occured on /stations/:rpuids/onair.', error);
			res.status(500).send('Server error.');
		}
	}
};
