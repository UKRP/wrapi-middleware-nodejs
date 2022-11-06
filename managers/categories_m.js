const Categories = require("../models/categories");

class Categories_Manager {
	constructor(wp) {
		this.wp = wp;
		this.categories = {};
	}

	async getCategories(params) {
		if (!this.categories[params.country]) {
			this.categories[params.country] = new Categories();
		}
		return this.categories[params.country].getCategories(params, this.wp);
	}
}

module.exports = Categories_Manager;
