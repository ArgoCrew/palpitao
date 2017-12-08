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

// load
// ====
// Routines for loading data from the database
//

// 
// load([query] table [id|criteria] callback)
// ----
// 
// Retrieves a single row from table where the id matches the id parameter, or
// where the criteria matches.  Returns an error if more than one row was
// returned, and null if none were.
//
//  + table - Table name or reference
//  + id - Row ID (primary key value)
//  + criteria - Object containing search criteria
//  + callback - (err, row)
//
// If now row is found, then an error is returned and row === false.  For other
// errors, row is undefined.
// 
// Same usage as loadMany but obviously the LIMIT specifiers are not used.
// 
ORM.prototype.load = function () {
	var args = parse_args(this, arguments);
	var query = args.query;
	var table = args.table;
	var criteria = args.data;
	var callback = args.callback;
	var self = this;
	this.loadMany(table, criteria, { count: 2 }, function (err, res) {
		if (err) {
			return callback(err);
		}
		if (res.length === 0) {
			return callback(new Error('Item not found'), null);
		}
		else if (res.length > 1) {
			return callback(new Error('Multiple rows were returned for GET ' +
				'operation on table '+table.$name+' with criteria ' +
				JSON.stringify(criteria)));
		}
		callback(null, res[0]);
	});
};

// 
// loadMany([query] table [criteria [options] ] callback)
// --------
// 
// Retrieves all rows from table which match the criteria.
//
//  + table - Ttble name or reference
//  + criteria - Object containing search criteria
//  + options - Extra query options
//     + lookup (default: true) - Specifies whether to lookup records related
//       over foreign keys.  TODO: Number to specify lookup depth.
//     + fields - Array of names of fields to retrieve.  All fields are
//       retrieved if this is not specified.
//     + sort - Name of field to sort on, or array of fields to sort on.  Prefix
//       a `+` or `-` to the field name to specify ascending or descending
//       order.  You may specify field objects or field names or a mix of both.
//     + first, last, count - Limit the range of records retrieved.  Any
//       combination which allows `count` to be calculated is valid.
//  + callback - (err, rows)
//    
// ### Example:
// 
//     loadMany(
//       schema.users,
//       {
//         // role is a foreign key: pass an object as the value to have it
//         // looked up in the parent table.  Non-object values will be treated
//         // as raw values in this table and will not be looked up in the
//         // parent table.  Cry me a river if you want a field value returned
//         // instead of an object, but this allows one to look up a record by
//         //  ID number on a foreign field, in addition to enjoying the lovely
//         // foreign-key handling provided by this library/framework/module.
//         role: { value: 'admin' }
//      },
//      {
//         fields: { 'name', schema.users.id, schema.users.country },
//         sort: schema.users.name,  //or '+name'
//         count: 10
//       },
//       function (err, rows) {
//         if (err) throw err;
//         rows.forEach(function (row) {
//           console.log(
//             'Admin #' + row.id + ' ' +
//             '"' + row.name + '" ' +
//             'is from ' + row.country.value);
//         });
//       });
// 
// 
ORM.prototype.loadMany = function () {
	var args = parse_args(this, arguments);
	var query = args.query;
	var table = args.table;
	var criteria = args.data;
	var options = args.options;
	var callback = args.callback;
	var self = this;
	var lookup = !_(options).has('lookup') || criteria.lookup;
	async.parallel([
			async.apply(sql.select, this, options.fields),
			async.apply(sql.from, this, table),
			async.apply(sql.where, this, query, table, criteria),
			async.apply(sql.orderby, this, table, options.sort),
			async.apply(sql.limit, this, options)
			/*
			 * TODO: JOINs so we can get the foreign key stuff in one operation
			 * instead of running several SELECTs on every row which is obviously
			 * going to be insanely slow for large datasets.
			 */
		],
		function (err, sqlParts) {
			if (err) {
				return callback(err);
			}
			query(_(sqlParts).compact().join('\n'), null, function (err, rows) {
				if (err) {
					return callback(err);
				}
				if (!lookup) {
					return callback(null, rows);
				}
				async.each(rows,
					function (row, callback) {
						/* Deserialize */
						names(table).forEach(function (key) {
							if (table[key].deserialize) {
								row[key] = table[key].deserialize(row[key]);
							}
						});
						/* Lookup references */
						self.lookupForeignValues(query, table, row, options,
							callback);
					},
					function (err) {
						if (err) {
							return callback(err);
						}
						callback(null, rows);
					});
			});
		});
};
