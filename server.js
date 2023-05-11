#!/usr/bin/env node
require("dotenv").config();

const fs = require("fs");
const https = require("https");
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

const logger = require("./logger");

const Base64 = require("js-base64");
const Enum = require("./enum");
Enum.Authorization = Enum.Authorization.map((x) => "Basic " + Base64.btoa(x));
//console.log(Enum.Authorization)

/*
 *	Check if necessary files exist and data filled
 */
if (!fs.existsSync("./.env")) {
	logger.error(".env file is missing.");
	process.exit(1);
}
if (!process.env.HTTPS_PRIVATE_KEY || !process.env.HTTPS_CERTIFICATION || !process.env.WRAPI_KEY_ID) {
	logger.error(".env file data lacking. Please refer to documentation.");
	process.exit(1);
}
if (
	!fs.existsSync("./" + process.env.HTTPS_PRIVATE_KEY + ".pem") ||
	!fs.existsSync("./" + process.env.HTTPS_CERTIFICATION + ".pem") ||
	!fs.existsSync("./" + process.env.WRAPI_KEY_ID + ".pem")
) {
	logger.error("A key file is missing or incorrect. Please refer to documentation.");
	process.exit(1);
}

app.use((req, res, next) => {
	if (Enum.Authorization.includes(req.headers.authorization)) {
		next();
	} else {
		res.status(401).send();
	}
});

const domTomFr = [312, 474, 638, 254];

app.use(cors());

app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
	// If query country code refer to France DOM TOM
	if (domTomFr.includes(Number(req.body.country))) {
		// change country code to France
		req.body.country = '250';
	}
	if (domTomFr.includes(Number(req.query.country))) {
		// change country code to France
		req.query.country = '250';
	}
	next();
});

const categoriesRoutes = require("./routes/categories_r");
const ondemandRoutes = require("./routes/ondemand_r");
const recommendationsRoutes = require("./routes/recommendations_r");
const stationsRoutes = require("./routes/stations_r");

app.use("/categories", categoriesRoutes);
app.use("/ondemand", ondemandRoutes);
app.use("/recommendations", recommendationsRoutes);
app.use("/stations", stationsRoutes);

app.get("/", function (req, res) {
	res.end();
});

const credentials = {
	key: fs.readFileSync(process.env.HTTPS_PRIVATE_KEY + ".pem"),
	cert: fs.readFileSync(process.env.HTTPS_CERTIFICATION + ".pem"),
};
var httpsServer = https.createServer(credentials, app);
httpsServer.listen(443);
logger.info("REST middleware start on port 443.");
