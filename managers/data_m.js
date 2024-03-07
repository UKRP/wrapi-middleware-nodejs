const Wrapi = require('radioplayer-wrapi-sdk').default;
const fs = require('fs');
const key_file = fs.readFileSync(process.env.WRAPI_KEY_ID + '.pem');
const wrapi = new Wrapi({ keyId: process.env.WRAPI_KEY_ID, key: key_file });

const Response = require('../models/response');

const logger = require('../logger');

class DataManager {
	constructor() {
		this.wrapi = wrapi;
		this.categories = {};
		this.onAir = {};
		this.ondemands = {};
		this.programs = {};
		this.recommendations = new Map();
		this.stationsObj = {};
		this.stationsArr = [];
		this.stationsGeo = [];
		this.stationsOndemand = {};
		this.stationsNextUpdate = 0;
		this.countriesWhiteList = [];
	}

	getCachingTimeout = (type, minimum) => {
		if (!Boolean(process.env.CUSTOM_CACHING)) return minimum;
		switch (type) {
			case 'onair':
				const onAirCachingValue = Number(process.env.ONAIR_CACHING);
				return Math.min(
					!isNaN(onAirCachingValue) ? new Date().getTime() + onAirCachingValue : minimum,
					minimum,
				);
			case 'schedule':
				const scheduleCachingValue = Number(process.env.SCHEDULE_CACHING);
				return Math.min(
					!isNaN(scheduleCachingValue) ? new Date().getTime() + scheduleCachingValue : minimum,
					minimum,
				);
			case 'ondemand':
				const onDemandCachingValue = Number(process.env.ONDEMAND_CACHING);
				return Math.min(
					!isNaN(onDemandCachingValue) ? new Date().getTime() + onDemandCachingValue : minimum,
					minimum,
				);
			case 'stations':
				const stationsCachingValue = Number(process.env.STATIONS_CACHING);
				return Math.min(
					!isNaN(stationsCachingValue) ? new Date().getTime() + stationsCachingValue : minimum,
					minimum,
				);
			case 'categories':
				const categoriesCachingValue = Number(process.env.CATEGORIES_CACHING);
				return Math.min(
					!isNaN(categoriesCachingValue) ? new Date().getTime() + categoriesCachingValue : minimum,
					minimum,
				);
		}
		return 0;
	};

	getCategories() {
		return this.categories;
	}

	getCountriesWhiteList() {
		return this.countriesWhiteList;
	}

	async getOnAir(query, rpuid) {
		const country = rpuid.slice(0, 3);
		if (!this.onAir[rpuid]) {
			this.onAir[rpuid] = { current: { data: null, nextUpdate: null }, next: { data: null, nextUpdate: null } };
		}
		let key = query && query.next ? 'next' : 'current';
		if (!this.onAir[rpuid][key] || new Date().getTime() > this.onAir[rpuid][key].nextUpdate) {
			let onAir = null;
			try {
				onAir = await this.wrapi.getOnAir({ rpuids: [rpuid], ...query });
				if (onAir.error) throw onAir.error;
				if (onAir.data[0]) {
					this.onAir[rpuid][key].data = onAir.data[0];
					this.onAir[rpuid][key].nextUpdate = this.getCachingTimeout(
						'onair',
						onAir.data[0].meta.cacheExpiresAt,
					);
				} else {
					this.onAir[rpuid][key].data = null;
					this.onAir[rpuid][key].nextUpdate = null;
					return new Response(0, [], { rpuid: rpuid, country: country });
				}
			} catch (error) {
				this.onAir[rpuid][key].data = null;
				logger.error('An error occured during Stations get onAir update.', 'rpuid :' + rpuid, error);
				if (error) throw error;
			}
		}
		return new Response(this.onAir[rpuid][key].nextUpdate, this.onAir[rpuid][key].data.data, {
			rpuid: rpuid,
			country: country,
		});
	}

	async getOnDemand(query, rpuid, seriesId) {
		const params = { rpuid: rpuid, ...query };
		if (seriesId) params.seriesId = seriesId;
		const type = 'ondemand';
		if (!this.stationsOndemand[rpuid]) {
			this.stationsOndemand[rpuid] = { seriesId: {}, pure: {} };
		} else {
			const response = this.getPaginatedData(
				seriesId ? this.stationsOndemand[rpuid].seriesId[seriesId] : this.stationsOndemand[rpuid].pure,
				params,
				query,
				type,
			);
			if (response) return response;
		}
		try {
			let ondemand = await this.wrapi.getStationOndemand(params);
			if (ondemand.error) throw ondemand.error;
			if (ondemand.meta.paginated) {
				let size = query.size ? query.size : 10;
				if (seriesId) {
					if (!this.stationsOndemand[rpuid].seriesId[seriesId]) {
						this.stationsOndemand[rpuid].seriesId[seriesId] = {};
					}
					if (!this.stationsOndemand[rpuid].seriesId[seriesId][ondemand.meta.pageNumber]) {
						this.stationsOndemand[rpuid].seriesId[seriesId][ondemand.meta.pageNumber] = {};
					}
					this.stationsOndemand[rpuid].seriesId[seriesId][ondemand.meta.pageNumber][size] = ondemand;
					this.stationsOndemand[rpuid].seriesId[seriesId][ondemand.meta.pageNumber][size].nextUpdate =
						this.getCachingTimeout(type, ondemand.meta.cacheExpiresAt);
				} else {
					if (!this.stationsOndemand[rpuid].pure[ondemand.meta.pageNumber]) {
						this.stationsOndemand[rpuid].pure[ondemand.meta.pageNumber] = {};
					}
					this.stationsOndemand[rpuid].pure[ondemand.meta.pageNumber][size] = ondemand;
					this.stationsOndemand[rpuid].pure[ondemand.meta.pageNumber][size].nextUpdate =
						this.getCachingTimeout(type, ondemand.meta.cacheExpiresAt);
				}
				let list = seriesId
					? this.stationsOndemand[rpuid].seriesId[seriesId]
					: this.stationsOndemand[rpuid].pure;
				let response = new Response(
					list[ondemand.meta.pageNumber][size].nextUpdate,
					list[ondemand.meta.pageNumber][size].data,
					params,
					type,
				);
				response.setPagination(ondemand.meta.pageNumber, ondemand.meta.pageSize, ondemand.meta.totalPages);
				return response;
			} else {
				if (seriesId) {
					this.stationsOndemand[rpuid].seriesId[seriesId] = ondemand;
					this.stationsOndemand[rpuid].seriesId[seriesId].nextUpdate = this.getCachingTimeout(
						type,
						stationsOndemand[rpuid].meta.cacheExpiresAt,
					);
				} else {
					this.stationsOndemand[rpuid].pure = ondemand;
					this.stationsOndemand[rpuid].pure.nextUpdate = this.getCachingTimeout(
						type,
						ondemand.meta.cacheExpiresAt,
					);
				}
				let list = seriesId
					? this.stationsOndemand[rpuid].seriesId[seriesId]
					: this.stationsOndemand[rpuid].pure;
				return new Response(list.nextUpdate, list.data, params, type);
			}
		} catch (error) {
			logger.error('An error occured during Stations get onDemand update.', error);
			if (error) throw error;
		}
	}

	getOnDemands() {
		return this.ondemands;
	}

	getRecommendations() {
		return this.recommendations;
	}

	getPaginatedData(list, params, query, type) {
		if (list) {
			if (list.data) {
				if (new Date().getTime() > list.data.nextUpdate) {
					return new Response(list.nextUpdate, list.data, params, type);
				}
			} else {
				let page = query.page ? query.page : 0;
				let size = query.size ? query.size : 10;
				if (
					list[page] &&
					list[page][size] &&
					(list[page][size].meta.paginated ||
						(list[page][size].meta.nesting && list[page][size].data[0].meta.paginated))
				) {
					if (new Date().getTime() < list[page][size].nextUpdate) {
						let response;
						if (list[page][size].meta.nesting) {
							response = new Response(
								list[page][size].nextUpdate,
								list[page][size].data[0].data,
								params,
								type,
							);
							response.setPagination(
								list[page][size].data[0].meta.pageNumber,
								list[page][size].data[0].meta.pageSize,
								list[page][size].data[0].meta.totalPages,
							);
						} else {
							response = new Response(list[page][size].nextUpdate, list[page][size].data, params, type);
							response.setPagination(
								list[page][size].meta.pageNumber,
								list[page][size].meta.pageSize,
								list[page][size].meta.totalPages,
							);
						}
						return response;
					}
				}
			}
		}
		return null;
	}

	async getPrograms(query, rpuid) {
		const wrapiParams = { rpuids: [rpuid], ...query };
		const reqParams = { rpuid: rpuid, ...query };
		const type = 'schedule';
		if (query && query.from) {
			const response = await this.wrapi.getSchedule(wrapiParams);
			return response;
		} else {
			if (!this.programs[rpuid]) {
				this.programs[rpuid] = {};
			} else {
				const response = this.getPaginatedData(this.programs[rpuid], reqParams, query, type);
				if (response) return response;
			}
			try {
				const schedule = await this.wrapi.getSchedule(wrapiParams);
				if (schedule.error) throw schedule.error;
				if (schedule.data[0].meta.paginated) {
					let size = query.size ? query.size : 10;
					if (!this.programs[rpuid][schedule.data[0].meta.pageNumber]) {
						this.programs[rpuid][schedule.data[0].meta.pageNumber] = {};
					}
					this.programs[rpuid][schedule.data[0].meta.pageNumber][size] = schedule;
					this.programs[rpuid][schedule.data[0].meta.pageNumber][size].nextUpdate = this.getCachingTimeout(
						type,
						schedule.data[0].meta.cacheExpiresAt,
					);
					const response = new Response(
						this.programs[rpuid][schedule.data[0].meta.pageNumber][size].nextUpdate,
						this.programs[rpuid][schedule.data[0].meta.pageNumber][size].data[0].data,
						reqParams,
					);
					response.setPagination(
						schedule.data[0].meta.pageNumber,
						schedule.data[0].meta.pageSize,
						schedule.data[0].meta.totalPages,
					);
					return response;
				} else {
					this.programs[rpuid] = schedule;
					this.programs[rpuid].nextUpdate = this.getCachingTimeout(type, schedule.data[0].cacheExpiresAt);
					return new Response(this.programs[rpuid].nextUpdate, this.programs[rpuid].data, reqParams);
				}
			} catch (error) {
				logger.error('An error occured during Stations get Scheduling update.', error);
				if (error) throw error;
			}
		}
	}

	getStationsArray() {
		return this.stationsArr;
	}

	getStationsGeolocated(lat, long) {
		if (!this.stationsGeo[lat]) this.geo_list[lat] = [];
		return this.stationsGeo[lat][long];
	}

	getStationsObject() {
		return this.stationsObj;
	}

	getStationsNextUpdate() {
		return this.stationsNextUpdate;
	}

	getWrapi() {
		return this.wrapi;
	}

	setStationsNextUpdate(stationsNextUpdate) {
		this.stationsNextUpdate = stationsNextUpdate;
	}

	setStationsArray(stations) {
		this.stationsArr = stations;
	}

	setStationsGeolocated(lat, long, stations) {
		this.stationsGeo[lat][long] = stations;
	}

	setStationsObject(stations) {
		this.stationsObj = stations;
	}

	setCountriesWhiteList(countriesWhiteList) {
		this.countriesWhiteList = countriesWhiteList;
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
