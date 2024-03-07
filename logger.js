const fs = require('fs');

/*
 *  Create or/and update Middleware log file and send error with it's associated date time in console.
 */
const error = (error_message, error_data) => {
	let data = '' + new Date().toLocaleString() + ' - ' + error_message + '\n';
	if (typeof error_data === 'string') data = data.concat(error_data).concat('\n');

	let file = 'middleware_error.txt';
	if (!fs.existsSync('./' + file)) {
		fs.writeFileSync('./' + file, data);
	} else {
		fs.appendFileSync('./' + file, data);
	}
	console.log(new Date().toLocaleString() + ' : ' + error_message);
	if (error_data) console.log(error_data);
};

/*
 *  Send message with it's associated date time in console.
 */
const info = (message) => {
	console.log(new Date().toLocaleString() + ' : ' + message);
};

module.exports = {
	error,
	info,
};
