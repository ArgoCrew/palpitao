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
var _ = require('underscore');
var async = require('async');

var utils = require('./utils');
var sql = require('./sql');

var names = utils.names;
var parse_args = utils.parse_args;

var ORM = { prototype: {} };
module.exports = ORM.prototype;

// foreign-keys
// ============
// Foreign key support
// 
// The options query parameter is a function (format, params, callback),
// such as the mysql connection.query method.  This allows intercepting of
// queries (e.g. for logging) and transactional operations even when the ORM
// is using a connection pool.
//

// 
// listForeignKeys(table)
// ---------------
// 
// Returns an array of names of fields in the table which have a foreign key
// constraint.
// 
// ### Example
// 
//     var names = listForeignKeys(schema.users);
// 
ORM.prototype.listForeignKeys = function (table) {
	if (_(table).isString()) {
		table = this.schema[table];
	}
	return names(table).filter(function (col) { return !!table[col].references; });
};

// 
// lookupForeignId([query] field criteria [options] callback)
// ---------------
// 
// Looks up the id of the parent record, identified by search criteria. Returns
// an error if no or if multiple parent records are found.  In such a case, the
// second callback paremeter is zero or two for no or multiple records found.
// 
// ### Example
// 
//     lookupForeignKey(schema.users.country, { name: 'Estonia' },
//       function (err, value) { ... });
// 
ORM.prototype.lookupForeignId = function () {
	var args = parse_args(this, arguments, true);
	var query = args.query;
	var field = args.field;
	var criteria = args.data;
	var options = args.options;
	var callback = args.callback;
	var self = this;
	var foreign = field.references;
	async.parallel([
			async.apply(sql.select, this, [foreign.$name]),
			async.apply(sql.from, this, foreign.$table),
			async.apply(sql.where, this, query, foreign.$table, criteria),
			async.apply(sql.limit, this, { count: 2 })
		],
		function (err, sqlParts) {
			query(_(sqlParts).compact().join('\n'), null, function (err, rows) {
				if (err) {
					self.warn('Error occurred while looking up foreign id');
					return callback(err);
				}
				if (rows.length !== 1) {
					return callback(new Error(self.warn(
								(rows.length > 1 ? 'Multiple' : 'No') +
								' foreign ids found')),
								rows.length);
				}
				var row = rows[0];
				callback(null, row[foreign.$name]);
			});
		});
};

// 
//  lookupForeignIds([query] table row [options] callback)
//  ----------------
// 
// Looks up all foreign key values for a row
// 
// Any foreign-key fields in row which contain an object are assumed to be
// search criteria.  lookupForeignId is used to fill in their corresponding id
// values.  Those values of row are replaced with the id values, then the same
// (modified) row object is passed to the callback.
// 
// ### Example
// 
//     lookupForeignIds(schema.users,
//       {
//         name: 'mark',
//         country: { name: 'Estonia' },
//         role: { name: 'admin' }
//       },
//       function (err, value) { ... });
// 
//     // value.country = 372, value.role = <some id value>
// 
ORM.prototype.lookupForeignIds = function () {
	var args = parse_args(this, arguments);
	var query = args.query;
	var table = args.table;
	var row = args.data;
	var callback = args.callback;
	var options = args.options;
	var self = this;
	var cols = options.cols || this.listForeignKeys(table);
	async.each(cols,
		function (col, callback) {
			var field = table[col];
			if (!field) {
				throw new Error('Field "' + col + '" not found in table "' +
					table.$name + '"');
			}
			var value = row[col];
			if (!_(value).isObject()) {
				return callback(null);
			}
			self.lookupForeignId(query, field, value, function (err, res) {
				if (err) {
					return callback(err);
				}
				row[col] = res;
				callback(null);
			});
		},
		function (err) {
			callback(err, row);
		});
};

// lookupForeignValue([query] field id [options] callback)
// ----------------
// Get the data corresponding to a given ID value in a foreign key ralationship
//
ORM.prototype.lookupForeignValue = function () {
	var args = parse_args(this, arguments, true);
	var query = args.query;
	var field = args.field;
	var id = args.data;
	var callback = args.callback;
	var options = args.options;
	var self = this;
	var foreign = field.references;
	var criteria = _.object([foreign.$name], [id]);
	this.load(query, foreign.$table, criteria, options, function (err, res) {
		if (err) {
			self.warn('Error occurred while looking up foreign row');
			return callback(err);
		}
		callback(null, res);
	});
};

//
// lookupForeignValues([query] table row [options] callback)
// ----------------
// Uses lookupForeignValue to get data for fields which have foreign key
// relationships
//
ORM.prototype.lookupForeignValues = function () {
	var args = parse_args(this, arguments);
	var query = args.query;
	var table = args.table;
	var row = args.data;
	var callback = args.callback;
	var options = args.options;
	var cols = options.cols || this.listForeignKeys(table);
	var self = this;
	async.each(cols,
		function (col, callback) {
			var field = table[col], id = row[col], foreign = field.references;
			if (_(id).isNull() || _(id).isObject()) {
				return callback(null);
			}
			self.lookupForeignValue(query, field, id, options, function (err, res) {
				if (err) {
					return callback(err);
				}
				row[col] = res;
				callback(null);
			});
		},
		function (err) {
			callback(err, row);
		});
};
