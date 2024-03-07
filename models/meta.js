/*
 *	Meta class recreate meta sent in the original WRAPI Response
 */
class Meta {
	constructor(cache, count, params, type) {
		this.cacheExpiresAt = cache > 0 ? cache : null;
		this.count = count;
		this.fromCache = cache > 0;
		this.paginated = false;

		const __this = this;
		for (let key in params) {
			__this[key] = params[key];
		}
		this.dataType = type;
		this.nesting = type === 'schedule' || type === 'onair';
	}

	setPagination(pageNumber, size, totalPages) {
		this.firstPage = pageNumber == 0;
		this.lastPage = pageNumber == totalPages - 1;
		this.pageNumber = pageNumber;
		this.totalPages = totalPages;
		this.pageSize = size <= 10 ? size : 10;
		this.paginated = true;
	}
}

module.exports = Meta;
