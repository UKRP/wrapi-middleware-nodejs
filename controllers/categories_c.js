const DataManager = require('../managers/data_m');
const dataManager = new DataManager().getInstance();
const Response = require('../models/response');

const logger = require('../logger');

function cleanUpCategories() {
	const currentTime = new Date().getTime();
	const categories = dataManager.getCategories();
	Object.keys(categories).forEach((country) => {
		Object.keys(categories[country]).forEach((type) => {
			if (currentTime > categories[country][type].nextUpdate) {
				delete categories[country][type];
			}
		});
	});
}

setInterval(cleanUpCategories, 3600000); // 3600000 ms = 1 h

exports.getCategories = async (req, res) => {
	const country = req.query.country;
	try {
		if (!dataManager.getCountriesWhiteList().includes(Number(country))) {
			return res.status(400).send('Unauthorized country.');
		}
		const type = req.query.type;
		const categories = dataManager.getCategories();
		if (!categories[country]) {
			categories[country] = {};
		}
		if (!categories[country][type] || new Date().getTime() > categories[country][type].nextUpdate) {
			try {
				const wrapiCategories = await dataManager.getWrapi().getCategories({ type: type, country: country });
				if (wrapiCategories.error) throw wrapiCategories.error;
				categories[country][type] = wrapiCategories;
				categories[country][type].nextUpdate = dataManager.getCachingTimeout(
					'categories',
					wrapiCategories.meta.cacheExpiresAt,
				);
			} catch (error) {
				if (categories[country][type]) categories[country][type].data = null;
				logger.error('An error occured during Categories update.', error);
				throw error;
			}
		}
		res.send(
			new Response(categories[country][type].nextUpdate, categories[country][type].data, req.query, 'categories'),
		);
	} catch (error) {
		if (error.statusCode) {
			res.status(error.statusCode).send('WRAPI error.');
		} else {
			logger.error('An error occured on /categories.', error);
			res.status(500).send('Server error.');
		}
	}
};
