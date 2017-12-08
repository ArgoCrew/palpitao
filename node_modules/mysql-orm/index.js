'use strict';
/*
 * MySQL object-relational mapping
 * ===============================
 *
 * (C) 2014 Mark K Cowan <mark@battlesnake.co.uk>
 *
 * https://github.com/battlesnake/node-mysql-orm
 *
 * Released under GNU General Public License, Version 2
 *
 */

var mysql = require('mysql');
var async = require('async');
var _ = require('underscore');

var utils = require('./utils');

// mysql-orm
// =========
// MySQL wrapper for nodejs with focus on foreign keys, rapid development, and
// easy deployment.

// exports.create
// --------------
// Use this to create an ORM instance.  The parameters are passed through to the
// ORM constructor.  See the documentation for the ORM constructor, below.
// 
//     var mysqlOrm = require('mysql-orm');
//     var orm = mysqlOrm.create(schema, data, options, function (err, orm) {
//       if (err) throw err;
//       ...
//     });
// 
module.exports.create = function (schema, defaultdata, options, onready) {
	return new ORM(schema, defaultdata, options, onready);
};

// names
// -----
// Returns an array of names of properties of the object excluding names that
// begin with a '$' symbol.
module.exports.names = function (obj) {
	return utils.names(obj);
};


// ORM constructor
// ---------------
//  + schema - Defines the structure of the database and the relations.
//    This is described below.
//  + defaultdata - Initial data to put in database if we (re-)create it.
//    This is described below.
//  + options - ORM configuration
//    + database - Name of the database
//    + mysql - MySQL connection parameters (felixge/node-mysql)
//    + debug - Slows the logger
//    + logLevel - Set the logging verbosity. **MUST BE >= 1**
//      1. Errors only (throws them after logging)
//      2. Warnings and level 1
//      3. Debugging info and level 2
//    + recreateDatabase - Drop the database and recreate it **DANGER**
//    + recreateTables - Drop tables and recreate them **DANGER**
//    + skipChecks - Don't check existence of database and tables (causes
//      recreate* params to be ignored), don't initialise database, onready is
// 
// ### Dataset definition
// 
//     defaultdata = {
//       table-name: [
//         { field-name: field-value, field-name: field-value, ... }
//       ],
//       table-name: [
//         ...
//       ],
//       ...
//     }
// 
//     field-value = <value> | reference-criteria
// 
// ### Example dataset using reference criteria
// 
//     var defaultdata = {
//       users: [
//         {
//           name: 'Mark',
//           age: 25,
//           country: { id: 370 },
//           role: { name: 'admin' }
//         }
//       ],
//       countries: [
//         { id: 44, name: 'United Kingdom' },
//         { id: 370, name: 'Lithuania' },
//         { id: 372: name: 'Estonia' }
//       ]
//     };
// 
// 
// ### Schema definition
// 
//     schema = {
//       [ $types: type-aliases, ]
//       table-name: table-definition,
//       table-name: table-definition,
//       ...
//     }
// 
// #### Type aliases
// 
//     type-aliases = [
//       alias-name: basic-type,
//       alias-name: basic-type,
//       ...
//     ]
// 
// #### Table definitions
// 
//     // <id: '::id'> is automatically added to all tables for now
//     table-definition = {
//       [ $primary: field-list, ]    // Not implemented yet
//       [ $sort: field-list, ]
//       field: field-definition,
//       field: field-definition,
//       ...
//     }
// 
// #### Field definitions
// 
//     field-definition = 'type-name[,index][,unique][,nullable][,cascade]'
//     
//     field-definition =  {
//       type: type-name,
//       [ index: boolean ],
//       [ unique: boolean ],
//       [ nullable: boolean ],
//       [ default: value ],
//       [ onDelete: reference-option ],
//       [ onUpdate: reference-option ],
//       [ references: field-definition | table-name ]    // Not tested yet
//     }
// 
// #### Types
// 
//     type-name = alias-name | basic-type
// 
//     basic-type = database-type | reference-type
// 
//     database-type = 'VARCHAR(16)', 'TIMESTAMP', 'BIT', 'INTEGER', etc
// 
//     reference-type = ':table-name'
// 
// #### Field list
// 
//     field-list = 'field-name' | ['field-name', 'field-name', ...]
// 
// #### Reference option
// 
//     reference-option = 'set null' | 'cascade' | 'ignore'
// 
// 
function ORM(schema, defaultdata, options, onready) {
	var self = this;
	this.debug = options.debug || process.env.DEBUG_MYSQL_ORM;
	if (!schema || !options || (!options.skipChecks && !onready)) {
		throw new Error('Required parameter missing');
	}
	if (_(options).has('logLevel')) {
		this.logLevel = options.logLevel;
		if (process.env.DEBUG_MYSQL_ORM) {
			this.logLevel = 9;
		}
	}
	if (!options.database) {
		throw new Error('Compulsory option (lol) `database` not specified');
	}
	if (!options.mysql) {
		throw new Error('Compulsory option (lol) `mysql` not specified');
	}
	this.database = options.database;
	this.schema = JSON.parse(JSON.stringify(schema));
	this.types = schema.$types;
	Internal.initialise_schema(this);
	Internal.parse_schema(this);
	var createConnectionPool = function () {
		options.mysql.database = options.database;
		self.connection = mysql.createPool(options.mysql);
		self.query = self.loggedQuery(self.connection);
	};
	/* No checks - connect to the DB and return synchronously */
	if (options.skipChecks) {
		createConnectionPool();
		self.ready = true;
		if (_(onready).isFunction()) {
			onready(null, self);
		}
		return;
	}
	/* Statup checks */
	async.series([
			/* Create database */
			function (callback) {
				self.connection = mysql.createConnection(options.mysql);
				self.query = self.loggedQuery(self.connection);
				callback();
			},
			async.apply(Internal.create_database, self, options.recreateDatabase),
			function (callback) {
				self.connection.end(callback);
			},
			/* Create connection pool */
			function (callback) {
				createConnectionPool();
				callback(null);
			},
			/* Create tables and initialize data */
			async.apply(Internal.create_tables, self, options.recreateTables),
			function (callback) {
				if (defaultdata && (options.recreateTables || options.recreateDatabase)) {
					return self.saveMultipleTables(defaultdata, callback);
				}
				callback(null);
			}
		],
		function (err) {
			self.ready = true;
			if (_(onready).isFunction()) {
				onready(null, self);
			}
		});
}

ORM.prototype = {};
ORM.prototype.constructor = ORM;

_(ORM.prototype).extend(require('./logging'));
_(ORM.prototype).extend(require('./logging-query'));
_(ORM.prototype).extend(require('./transaction'));
_(ORM.prototype).extend(require('./foreign-keys'));
_(ORM.prototype).extend(require('./save'));
_(ORM.prototype).extend(require('./load'));
_(ORM.prototype).extend(require('./delete'));

var Internal = {};
_(Internal).extend(require('./autogen'));
_(Internal).extend(require('./initialise-schema'));
_(Internal).extend(require('./parse-schema'));


