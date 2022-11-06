const Meta = require("./meta");

/*
 *	Response class recreate the original WRAPI answer but with cache data in this API
 */
class Response {
	constructor(cache, data, params, type) {
		this.data = data;
		this.meta = new Meta(cache, data.length, params, type);
	}

	setPagination(pageNumber, size, totalPages) {
		this.meta.setPagination(pageNumber, size, totalPages);
	}
}

module.exports = Response;
