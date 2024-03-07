const express = require('express');
const router = express.Router();
const { query } = require('express-validator');

const CategoriesC = require('../controllers/categories_c');

const tools = require('../tools');

/*
 *  Returns a list of categories for live and on demand content which can be used when searching for content by category.
 *	WRAPI URL: https://api.radioplayer.org/v2/categories
 *	Call Reference : https://developers.radioplayer.org/api-reference/categories-1.0.html#supplies-a-list-of-category-names-and-their-hrefs
 */
router.get(
	'/',
	[
		query('country').isInt({ min: 0 }).withMessage('Invalid country format'),
		query('type').isIn(['live', 'ondemand']).withMessage('Invalid type format'),
	],
	tools.requestErrorHandler,
	CategoriesC.getCategories,
);

module.exports = router;
