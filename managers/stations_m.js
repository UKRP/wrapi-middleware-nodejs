const Response = require("../models/response");
const Station = require("../models/station");

const logger = require("../logger");
const tools = require("../tools");

class Stations_Manager {
	constructor(wp) {
		this.wp = wp;
		this.loadStations(wp);
	}

	radioExist(rpuid) {
		return !!this.list[rpuid];
	}

	/*
	 *	Returns all information on all stations, unless filtered by parameters.
	 *	Also provides the ability to search for stations in a number of ways including keyword searching,
	 *	category searching, search by bearers and search for local station.
	 */
	async getAllStations(query) {
		let list = this.list;
		if (query.geo) {
			let coo = query.geo.split(",");
			let lat = Math.round(coo[0] * 10) / 10;
			let long = Math.round(coo[1] * 10) / 10;
			if (!this.geo_list) this.geo_list = [];
			if (!this.geo_list[lat]) this.geo_list[lat] = [];
			if (!this.geo_list[lat][long]) {
				const stations = await this.wp.getStations({ country: query.country, geo: query.geo });
				if (stations.error) throw stations.error;
				this.geo_list[lat][long] = stations.data.map((station) => new Station(station));
			}
			list = this.geo_list[lat][long];
		}
		let stations = [];
		for (const station_rpuid in list) {
			if (!query) {
				stations.push(list[station_rpuid].getData());
			} else {
				if (query.include) {
					if (!list[station_rpuid].include(query.include)) continue;
				}
				if (query.country) {
					if (!(list[station_rpuid].data.country === query.country)) continue;
					if (query.search) {
						if (!list[station_rpuid].contains(query.search)) continue;
					}
				}
				if (query.bearerId) {
					if (!list[station_rpuid].gotBearerId(query.bearerId)) continue;
				}
				stations.push(list[station_rpuid].getData());
			}
		}
		if (query.sort) {
			stations = stations.sort((a, b) => {
				var nameA = a.name.toUpperCase();
				var nameB = b.name.toUpperCase();
				if (nameA < nameB) {
					return -1;
				}
				if (nameA > nameB) {
					return 1;
				}
				return 0;
			});
		}
		return new Response(this.nextUpdate, stations, query, "stations");
	}

	/*
	 *	Provides current “track now playing” or “track next playing” information from one or multiple radio stations.
	 */
	async getOnAirStations(rpuids, query) {
		let answer = [];
		for (let rpuid of rpuids.split(",")) {
			if (this.list[rpuid]) answer.push(await this.list[rpuid].getOnAir(query, this.wp));
		}
		return new Response(0, answer, {}, "onair");
	}

	async getOnDemand(rpuid, query, seriesId) {
		return await this.list[rpuid].getOnDemand(query, this.wp, seriesId);
	}

	/*
	 *	Returns recommended station for specific special country
	 */
	getRecommendation(country) {
		const countryStations = this.allStations
			.filter(
				(station) =>
					station.include("detail") && station.data.country == country && station.data.liveStreams.length > 0,
			)
			.map((station) => station.data)
			.sort((a, b) => b.bearers.length - a.bearers.length);
		return countryStations.sort(() => Math.random() - 0.5).splice(0, 20);
	}

	/*
	 *	Returns programme schedules for radio stations.
	 */
	async getScheduleStationsPrograms(rpuids, query) {
		let answer = [];
		for (let rpuid of rpuids.split(",")) {
			if (this.list[rpuid]) answer.push(await this.list[rpuid].getSchedulePrograms(query, this.wp));
		}
		return new Response(0, answer, {}, "schedule");
	}

	/*
	 *	Returns all informations on particulars stations, identified by their rpuid and may be
	 *  filtred by params 'include'.
	 */
	getStations(rpuids, query) {
		let stations = [];
		for (const rpuid of rpuids.split(",")) {
			if (this.list[rpuid]) {
				if (query.include) {
					if (!this.list[rpuid].include(query.include)) continue;
				}
				stations.push(this.list[rpuid].getData());
			}
		}
		return new Response(this.nextUpdate, stations, query, "stations");
	}

	getStationsFromList(list) {
		return this.allStations.filter((station) => list.includes(station.data.rpuid)).map((station) => station.data);
	}

	loaded() {
		return !!this.list;
	}

	async loadStations(wp) {
		try {
			const stations = await wp.getStations({});
			this.allStations = stations.data.map((station) => new Station(station));
			if (stations.error) throw stations.error;
			let list = {};
			for (let station_rpuid in stations.data) {
				list[stations.data[station_rpuid].rpuid] = new Station(stations.data[station_rpuid]);
			}
			this.updateList(list);
			this.nextUpdate = tools.setCachingTimeout("stations", stations.meta.cacheExpiresAt);
			const __this = this;
			setTimeout(async () => __this.loadStations(wp), __this.nextUpdate - new Date().getTime());
		} catch (error) {
			logger.error("An error occured during Stations update.", error);
		}
	}

	updateList(list) {
		if (this.list) {
			for (const station_rpuid in list) {
				if (this.list[station_rpuid]) {
					list[station_rpuid].keepExtraData(this.list[station_rpuid]);
				}
			}
		}
		this.list = list;
	}
}

module.exports = Stations_Manager;
