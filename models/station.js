class Station {
	constructor(data) {
		this.data = data;
	}

	contains(string) {
		return (
			(this.data.description && this.data.description.toLowerCase().includes(string.toLowerCase())) ||
			(this.data.name && this.data.name.toLowerCase().includes(string.toLowerCase()))
		);
	}

	getData() {
		return this.data;
	}

	gotBearerId(id) {
		return this.data.bearers.some((bearer) => bearer.id === id);
	}

	keepExtraData(station) {
		let __this = this;
		Object.keys(station).forEach((key) => {
			if (key != 'data') {
				__this[key] = station[key];
			}
		});
	}
}

module.exports = Station;
