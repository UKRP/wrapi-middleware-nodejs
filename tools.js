const Response = require("./models/response");

exports.setCachingTimeout = (type, minimum) => {
	if (!Boolean(process.env.CUSTOM_CACHING)) return minimum;
	switch (type) {
		case "onair":
			const onAirCachingValue = Number(process.env.ONAIR_CACHING);
			return !isNaN(onAirCachingValue) ? new Date().getTime() + onAirCachingValue : minimum;
		case "schedule":
			const scheduleCachingValue = Number(process.env.SCHEDULE_CACHING);
			return !isNaN(scheduleCachingValue) ? new Date().getTime() + scheduleCachingValue : minimum;
		case "ondemand":
			const onDemandCachingValue = Number(process.env.ONDEMAND_CACHING);
			return !isNaN(onDemandCachingValue) ? new Date().getTime() + onDemandCachingValue : minimum;
		case "stations":
			const stationsCachingValue = Number(process.env.STATIONS_CACHING);
			return !isNaN(stationsCachingValue) ? new Date().getTime() + stationsCachingValue : minimum;
		case "categories":
			const categoriesCachingValue = Number(process.env.CATEGORIES_CACHING);
			return !isNaN(categoriesCachingValue) ? new Date().getTime() + categoriesCachingValue : minimum;
	}
	return 0;
};

exports.getPaginatedData = (list, params, query, type) => {
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
};
