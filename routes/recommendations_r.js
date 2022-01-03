const express = require('express');
const router = express.Router();

const DataManager = require('../managers/data_m');
const dataManager = new DataManager().getInstance();

const logger = require('../logger');

/* 
 *  Shows recommended content based on station affinity, music preferences from social media such as facebook, 
 *  geolocation and generally trending stations.
 *	WRAPI URL: https://api.radioplayer.org/v2/recommendations
 *	Call Reference : https://developers.radioplayer.org/api-reference/recommendations-1.0.html#return-recommendations-for-radio-stations
 */
router.post('/', async function(req, res) {
	try {
		if(req.body.country && !isNaN(req.body.country) && req.body.factors &&
			(!req.body.factors.includes("AFFINITY") || (req.body.rpuid && !isNaN(req.body.rpuid))) &&
			(!req.body.factors.includes("GEO") || (req.body.longitude && !isNaN(req.body.longitude) && req.body.latitude && !isNaN(req.body.latitude))) &&
			(!req.body.factors.includes("MUSICMATCH") || (req.body.facebookArtists && req.body.artistPlayCounts ))){
			res.send(await dataManager.getRecommendationsManager().postRecommendations(req.body));
		}
		else{res.status(400).send('Bad Request.');}
	}
	catch (error) {
		if(error.statusCode) res.status(error.statusCode).send('WRAPI error.');
		else {
			logger.error("An error occured on /recommendations.", error);
			res.status(500).send('Server error.');
		}
	}
});

module.exports = router;