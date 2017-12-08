'use strict';

/*
 * MySQL object-relational mapping
 *
 * (C) 2014 Mark K Cowan, mark@battlesnake.co.uk
 *
 * Released under `GNU General Public License, Version 2`
 *
 */

//
// tests
// =====
// Tests / example usage
//


var mysql = require('mysql');
var async = require('async');
var read = require('read');

var mysql_orm = require('../');

var test = {
	data: require('./data'),
	readwrite: require('./readwrite'),
};

var orm = null, currentTest = 'Initialize configuration';

var debug = process.env.DEBUG || process.env.DEBUG_MYSQL_ORM;

async.waterfall([
	async.apply(test.data.initialize, debug),
	function createORM(config, callback) {
		currentTest = 'Create ORM object and initialize test database';
		if (debug) {
			config.orm_options.logLevel = 3;
			config.orm_options.debug = true;
		}
		mysql_orm.create(config.schema, config.data, config.orm_options, callback);
	},
	function (orm_, callback) {
		orm = orm_;
		if (!orm.debug) {
			orm.info('Setting logLevel to 2, info will not be reported from now on');
			orm.logLevel = 2;
		}
		callback(null);
	},
	function (callback) {
		currentTest = 'Read/write';
		test.readwrite(orm, callback);
	},
	],
	function (err) {
		if (err) {
			console.log('Test "%s" failed: %s', currentTest, err);
			return process.exit(1);
		}
		console.log('Tests passed!');
		process.exit(0);
	});
