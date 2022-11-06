const express = require("express");
const router = express.Router();

const DataManager = require("../managers/data_m");
const dataManager = new DataManager().getInstance();

const logger = require("../logger");

/*
 *  Returns a list of categories for live and on demand content which can be used when searching for content by category.
 *	WRAPI URL: https://api.radioplayer.org/v2/categories
 *	Call Reference : https://developers.radioplayer.org/api-reference/categories-1.0.html#supplies-a-list-of-category-names-and-their-hrefs
 */
router.get("/", async function (req, res) {
	try {
		if (
			req.query &&
			req.query.country &&
			!isNaN(req.query.country) &&
			req.query.type &&
			(req.query.type == "live" || req.query.type == "ondemand")
		) {
			res.send(await dataManager.getCategoriesManager().getCategories(req.query));
		} else {
			res.status(400).send("Bad Request.");
		}
	} catch (error) {
		if (error.statusCode) res.status(error.statusCode).send("WRAPI error.");
		else {
			logger.error("An error occured on /categories.", error);
			res.status(500).send("Server error.");
		}
	}
});

module.exports = router;
