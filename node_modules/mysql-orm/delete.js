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

var sql = require('./sql');
var utils = require('./utils');

var names = utils.names;
var parse_args = utils.parse_args;

var ORM = { prototype: {} };
module.exports = ORM.prototype;

// delete
// ======
// Deletes data from the database

// 
// delete([query] table id|criteria callback)
// ----------
// 
// Delete one row from a table
//
//  + table - Table name or reference
//  + id - Row ID (primary key value)
//  + criteria - Object containing search criteria
//  + callback - (err)
// 
// ### Example using primary key value
// 
//     delete(schema.users, 2, function (err, res) { ... });
// 
// ### Example using foreign value
// 
//     delete(schema.users, { role: { name: 'guest' } }, callback);
// 
// 
ORM.prototype.delete = function () {
	var args = parse_args(this, arguments);
	var query = args.query;
	var table = args.table;
	var criteria = args.data;
	var callback = args.callback;
	var self = this;
	async.parallel([
			async.apply(sql.select, this, table.$primary),
			async.apply(sql.from, this, table),
			async.apply(sql.where, this, query, table, criteria),
			async.apply(sql.limit, this, { count: 2})
		],
		function (err, sqlParts) {
			if (err) {
				return callback(err);
			}
			query(_(sqlParts).compact().join('\n'), null, function (err, res) {
				if (err) {
					return callback(err);
				}
				if (res.length === 0) {
					return callback(new Error('Item not found'), false);
				}
				else if (res.length > 1) {
					return callback(new Error('Multiple items matched'), true);
				}
				self.deleteMany(query, table, res[0], callback);
			});
		});
};

// 
// deleteMany([query] table id|criteria callback)
// ----------
// 
// Delete one or more rows from a table
//
//  + table - Table name or reference
//  + id - Row ID (primary key value)
//  + criteria - Object containing search criteria
//  + callback - (err, deleted_row_count)
// 
// ### Example using primary key value
// 
//     deleteMany(schema.users, 2, function (err, res) { ... });
// 
// ### Example using foreign value
// 
//     deleteMany(schema.users, { role: { name: 'guest' } }, callback);
// 
// 
ORM.prototype.delete = function () {
	var args = parse_args(this, arguments);
	var query = args.query;
	var table = args.table;
	var criteria = args.data;
	var callback = args.callback;
	var self = this;
	async.parallel([
			async.apply(sql.delete),
			async.apply(sql.from, this, table),
			async.apply(sql.where, this, query, table, criteria)
		],
		function (err, sqlParts) {
			if (err) {
				return callback(err);
			}
			query(_(sqlParts).compact().join('\n'), null, function (err, res) {
				if (err) {
					return callback(err);
				}
				return callback(null, res.affectedRows);
			});
		});
};
