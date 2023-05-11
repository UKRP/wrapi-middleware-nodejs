const axios = require("axios");
const Meta = require("../models/meta");

class Recommendations_Manager {
	constructor(wp, station_m) {
		this.wp = wp;
		this.station_m = station_m;
		this.cache = new Map();
		this.specialCountry = [
			20, 100, 191, 203, 233, 250, 348, 352, 428, 440, 470, 528, 616, 620, 642, 703, 705, 752
		];
	}

	async postRecommendations(body) {
		const country = Number(body.country);
		const specialCountryRecommendations = this.specialCountry.includes(country);
		const key = specialCountryRecommendations ? "country:" + country : this.generateKey(body);
		let response;
		if (!this.cache.has(key) || this.cache.get(key).date < new Date().getTime()) {
			if (specialCountryRecommendations) {
				let specialCountryRecommendation;
				if (body.country == 250) {
					const instance = axios.create({
						baseURL: process.env.frApiUrl,
					});
					instance.defaults.headers.common["Authorization"] = process.env.frApiAuth;
					const result = await instance.get("/radios/recommended/worldwide");
					specialCountryRecommendation = this.station_m.getStationsFromList(
						result.data.items.map((item) => "250" + item),
					);
				} else {
					specialCountryRecommendation = this.station_m.getRecommendation(country);
				}
				for (const recommendation of specialCountryRecommendation) {
					recommendation.type = "STATION";
					recommendation.factors = ["TRENDING"];
					delete recommendation.genre;
					recommendation.liveStreams = recommendation.liveStreams.map((liveStream) => {
						delete liveStream.audioFormat;
						return liveStream;
					});
				}
				const date = new Date().getTime();
				const cache = Number(process.env.RECOMMENDATIONS_CACHING);
				const cacheExpiresAt = date + cache;
				this.cache.set(key, {
					date: cacheExpiresAt,
					data: {
						data: specialCountryRecommendation,
						meta: new Meta(cacheExpiresAt, specialCountryRecommendation.length, {}, "recommendations"),
					},
				});
			} else {
				response = await this.wp.getRecommendation({ ...body });
				this.cache.set(key, {
					date: response.meta.cacheExpiresAt ? response.meta.cacheExpiresAt : new Date().getTime(),
					data: response,
				});
			}
		}
		return this.cache.get(key).data;
	}

	generateKey(obj) {
		return (
			"country" +
			obj.country +
			"rpuid" +
			obj.rpuid +
			"factors" +
			obj.factors +
			"latitude" +
			obj.latitude +
			"longitude" +
			obj.longitude +
			"facebookArtists" +
			obj.facebookArtists +
			"artistPlayCounts" +
			obj.artistPlayCounts +
			"onDemand" +
			obj.onDemand
		);
	}
}

module.exports = Recommendations_Manager;
