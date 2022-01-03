const express = require('express');
const router = express.Router();

const DataManager = require('../managers/data_m');
const dataManager = new DataManager().getInstance();

const logger = require('../logger');

/* 
 *  Returns details on all pieces of on-demand content, unless filtered by parameters which include text searching, 
 *  filtering by category, country or station.
 *	WRAPI URL: https://api.radioplayer.org/v2/ondemand
 *	Call Reference : https://developers.radioplayer.org/api-reference/ondemand-1.0.html#search-for-and-retrieve-on-demand-content
 */
router.get('/', async function(req, res) {
	try {
		if(req.query.country && !isNaN(req.query.country) && (!req.query.rpuids || (req.query.rpuids).split(',').every(rpuid => !isNaN(rpuid)))){
			res.send(await dataManager.getOnDemandsManager().getOnDemand(req.query));
		}
		else{res.status(400).send('Bad Request.');}
	}
	catch (error) {
		if(error.statusCode) res.status(error.statusCode).send('WRAPI error.');
		else {
			logger.error("An error occured on /ondemand/.", error);
			res.status(500).send('Server error.');
		}
	}
});

/* 
 *	Returns all information on a particular piece of on-demand content, identified by its OD ID.
 *	WRAPI URL: https://api.radioplayer.org/v2/ondemand/{odIds}
 *	Call Reference : https://developers.radioplayer.org/api-reference/ondemand-odIds-1.0.html#retrieve-on-demand-content-using-its-unique-id
 */
 router.get('/:odIds', async function(req, res) {
	try {
		if(req.params.odIds){
			res.send(await dataManager.getOnDemandsManager().getOnDemandByIds(req.params.odIds));
		}
		else{res.status(400).send('Bad Request.');}
	}
	catch (error) {
		if(error.statusCode) res.status(error.statusCode).send('WRAPI error.');
		else {
			logger.error("An error occured on /ondemand/{odIds}.", error);
			res.status(500).send('Server error.');
		}
	}
});

module.exports = router;