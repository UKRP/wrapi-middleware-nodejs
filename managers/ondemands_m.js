const OnDemands = require("../models/ondemands");

const logger = require("../logger");

class OnDemands_Manager {
	constructor(wp) {
		this.wp = wp;
		this.data = {};
	}

	async getOnDemand(params) {
		if (!this.data[params.country]) {
			this.data[params.country] = new OnDemands();
		}
		return await this.data[params.country].getOnDemand(params, this.wp);
	}

	async getOnDemandByIds(odIds) {
		try {
			const onDemand = await this.wp.getOnDemand({ odIds: odIds.split(",") });
			if (onDemand.error) throw onDemand.error;
			return onDemand;
		} catch (error) {
			logger.error("An error occured during OnDemand by odIds called on WRAPI.", error);
			throw error;
		}
	}
}

module.exports = OnDemands_Manager; //
