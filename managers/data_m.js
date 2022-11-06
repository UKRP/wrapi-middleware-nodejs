const wrapi = require("radioplayer-wrapi-sdk").default;
const fs = require("fs");
const key_file = fs.readFileSync(process.env.WRAPI_KEY_ID + ".pem");
const wp = new wrapi({ keyId: process.env.WRAPI_KEY_ID, key: key_file });

const Categories_M = require("./categories_m");
const OnDemands_M = require("./ondemands_m");
const Recommendations_M = require("./recommendations_m");
const Stations_M = require("./stations_m");

class DataManager {
	constructor() {
		this.wp = wp;
		this.categories_m = new Categories_M(this.wp);
		this.ondemands_m = new OnDemands_M(this.wp);
		this.stations_m = new Stations_M(this.wp);
		this.recommendations_m = new Recommendations_M(this.wp, this.stations_m);
	}

	getCategoriesManager() {
		return this.categories_m;
	}

	getOnDemandsManager() {
		return this.ondemands_m;
	}

	getRecommendationsManager() {
		return this.recommendations_m;
	}

	getStationsManager() {
		return this.stations_m;
	}
}

class Singleton {
	constructor() {
		if (!Singleton.instance) {
			Singleton.instance = new DataManager();
		}
	}

	getInstance() {
		return Singleton.instance;
	}
}

module.exports = Singleton;
