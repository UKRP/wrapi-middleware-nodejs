const axios = require('axios');

const DataManager = require('../managers/data_m');
const dataManager = new DataManager().getInstance();
const Meta = require('../models/meta');

const logger = require('../logger');

const specialCountry = [20, 100, 191, 203, 233, 250, 348, 352, 428, 440, 470, 528, 616, 620, 642, 703, 705, 752];

function cleanUpCache() {
	const recommendations = dataManager.getRecommendations();
	const currentTime = new Date().getTime();
	recommendations.forEach((value, key) => {
		if (value.date < currentTime) {
			recommendations.delete(key);
		}
	});
}

setInterval(cleanUpCache, 3600000); // 3600000 ms = 1 h

exports.postRecommendation = async (req, res) => {
	const country = Number(req.body.country);
	try {
		if (!dataManager.getCountriesWhiteList().includes(Number(country))) {
			return res.status(400).send('Unauthorized country.');
		}
		const factors = req.body.factors;
		if (
			(!factors.includes('AFFINITY') || req.body.rpuid) &&
			(!factors.includes('GEO') || (req.body.longitude && req.body.latitude)) &&
			(!factors.includes('MUSICMATCH') || (req.body.facebookArtists && req.body.artistPlayCounts))
		) {
			const recommendations = dataManager.getRecommendations();
			const specialCountryRecommendations = specialCountry.includes(country);
			const key = specialCountryRecommendations
				? 'country:' + country
				: 'country' +
				  country +
				  'rpuid' +
				  req.body.rpuid +
				  'factors' +
				  factors +
				  'latitude' +
				  req.body.latitude +
				  'longitude' +
				  req.body.longitude +
				  'facebookArtists' +
				  req.body.facebookArtists +
				  'artistPlayCounts' +
				  req.body.artistPlayCounts +
				  'onDemand' +
				  req.body.onDemand;
			if (!recommendations.has(key) || recommendations.get(key).date < new Date().getTime()) {
				if (specialCountryRecommendations) {
					let specialCountryRecommendation;
					if (country == 250) {
						const instance = axios.create({
							baseURL: process.env.frApiUrl,
						});
						instance.defaults.headers.common['Authorization'] = process.env.frApiAuth;
						const result = await instance.get('/radios/recommended/worldwide');
						const wrapiStations = dataManager.getStationsArray();
						specialCountryRecommendation = wrapiStations
							.filter((station) =>
								result.data.items.map((item) => '250' + item).includes(station.data.rpuid),
							)
							.map((station) => station.data);
					} else {
						const countryStations = dataManager
							.getStationsArray()
							.filter(
								(station) =>
									!!station.data.name &&
									!!station.data.description &&
									!!station.data.country &&
									station.data.country == country &&
									station.data.liveStreams.length > 0,
							)
							.map((station) => station.data)
							.sort((a, b) => b.bearers.length - a.bearers.length);
						specialCountryRecommendation = countryStations.sort(() => Math.random() - 0.5).splice(0, 20);
					}
					for (const recommendation of specialCountryRecommendation) {
						recommendation.type = 'STATION';
						recommendation.factors = ['TRENDING'];
						delete recommendation.genre;
						recommendation.liveStreams = recommendation.liveStreams
							? recommendation.liveStreams.map((liveStream) => {
									delete liveStream.audioFormat;
									return liveStream;
							  })
							: recommendation.liveStreams;
					}
					const cacheExpiresAt = new Date().getTime() + Number(process.env.RECOMMENDATIONS_CACHING);
					recommendations.set(key, {
						date: cacheExpiresAt,
						data: {
							data: specialCountryRecommendation,
							meta: new Meta(cacheExpiresAt, specialCountryRecommendation.length, {}, 'recommendations'),
						},
					});
				} else {
					const response = await dataManager.getWrapi().getRecommendation({ ...req.body });
					recommendations.set(key, {
						date: response.meta.cacheExpiresAt ? response.meta.cacheExpiresAt : new Date().getTime(),
						data: response,
					});
				}
			}
			res.send(recommendations.get(key).data);
		} else {
			res.status(400).send('Bad Request.');
		}
	} catch (error) {
		if (error.statusCode) {
			res.status(error.statusCode).send('WRAPI error.');
		} else {
			logger.error('An error occured on /recommendations.', error);
			res.status(500).send('Server error.');
		}
	}
};
