const DataManager = require('../managers/data_m');
const dataManager = new DataManager().getInstance();
const Response = require('../models/response');

const logger = require('../logger');

function cleanUpOnDemands() {
	const currentTime = new Date().getTime();
	const ondemands = dataManager.getOnDemands();
	Object.keys(ondemands).forEach((country) => {
		if (ondemands[country].nextUpdate && currentTime > ondemands[country].nextUpdate) {
			delete ondemands[country];
		} else {
			Object.keys(ondemands[country]).forEach((page) => {
				Object.keys(ondemands[country][page]).forEach((size) => {
					if (currentTime > ondemands[country][page][size].nextUpdate) {
						delete ondemands[country][page][size];
					}
				});
			});
		}
	});
}

setInterval(cleanUpOnDemands, 3600000); // 3600000 ms = 1 h

exports.getOnDemands = async (req, res) => {
	const country = req.query.country;
	try {
		if (!dataManager.getCountriesWhiteList().includes(Number(country))) {
			return res.status(400).send('Unauthorized country.');
		}
		const type = 'ondemand';
		if (!req.query.rpuids || req.query.rpuids.split(',').every((rpuid) => !isNaN(rpuid))) {
			// If category or search or rpuids query parameters set then return WRAPI answer
			if (req.query.category || req.query.search || req.query.rpuids) {
				const response = await dataManager.getWrapi().getOnDemand(req.query);
				return res.send(response);
			}
			// Else
			const ondemands = dataManager.getOnDemands();
			if (!ondemands[country]) {
				ondemands[country] = {};
			} else {
				// If some data already in cache go get it by query params received
				const response = dataManager.getPaginatedData(ondemands[country], req.query, req.query, type);
				if (response) {
					return res.send(response);
				}
			}
			// If there's no cache in correct query params request, get it in WRAPI
			const wrapiOndemandResponse = await dataManager.getWrapi().getOnDemand(req.query);
			if (wrapiOndemandResponse.error) throw wrapiOndemandResponse.error;
			if (wrapiOndemandResponse.meta.paginated) {
				const size = req.query.size ? req.query.size : 10;
				if (!ondemands[country][wrapiOndemandResponse.meta.pageNumber]) {
					ondemands[country][wrapiOndemandResponse.meta.pageNumber] = {};
				}
				ondemands[country][wrapiOndemandResponse.meta.pageNumber][size] = wrapiOndemandResponse;
				ondemands[country][wrapiOndemandResponse.meta.pageNumber][size].nextUpdate =
					dataManager.getCachingTimeout(type, wrapiOndemandResponse.meta.cacheExpiresAt);
				const response = new Response(
					ondemands[country][wrapiOndemandResponse.meta.pageNumber][size].nextUpdate,
					ondemands[country][wrapiOndemandResponse.meta.pageNumber][size].data,
					req.query,
					type,
				);
				response.setPagination(
					wrapiOndemandResponse.meta.pageNumber,
					wrapiOndemandResponse.meta.pageSize,
					wrapiOndemandResponse.meta.totalPages,
				);
				return res.send(response);
			} else {
				ondemands[country] = wrapiOndemandResponse;
				ondemands[country].nextUpdate = dataManager.getCachingTimeout(
					type,
					wrapiOndemandResponse.meta.cacheExpiresAt,
				);
				return res.send(new Response(ondemands[country].nextUpdate, ondemands[country].data, req.query, type));
			}
		} else {
			res.status(400).send('Bad Request.');
		}
	} catch (error) {
		if (error.statusCode) {
			res.status(error.statusCode).send('WRAPI error.');
		} else {
			logger.error('An error occured on /ondemand/.', error);
			res.status(500).send('Server error.');
		}
	}
};

exports.getOnDemandByIds = async (req, res) => {
	try {
		const odIds = req.params.odIds;
		try {
			const onDemand = await dataManager.getWrapi().getOnDemand({ odIds: odIds.split(',') });
			if (onDemand.error) throw onDemand.error;
			res.send(onDemand);
		} catch (error) {
			logger.error('An error occured during OnDemand by odIds called on WRAPI.', error);
			throw error;
		}
	} catch (error) {
		if (error.statusCode) res.status(error.statusCode).send('WRAPI error.');
		else {
			logger.error('An error occured on /ondemand/{odIds}.', error);
			res.status(500).send('Server error.');
		}
	}
};
