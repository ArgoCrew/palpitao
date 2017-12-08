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
var sql = require('./sql');

var names = utils.names;
var parse_args = utils.parse_args;

var ORM = { prototype: {} };
module.exports = ORM.prototype;

// save
// ====
// Saves data to the database
//
// NOTE: REPLACE will not be supported as it (quite rightly) wrecks foreign
// keys.  if you want to replace, do a delete followed by a save.
//

// 
// save([query] table row [options] callback)
// ----
// 
// Save a single row to table, updating when the primary key value matches an
// existing row and inserting otherwise.  Foreign key values are looked up
// automatically.
// 
//  + table - A table definition from the schema.
//  + row - An object representing the values to save.  Foreign key values
//    are resolved, see the foreign-keys module for more information.
//  + options
//     + save - Specifies whether save can create/overwrite rows.
//        + 'new' - Only create a new row, fail on existing id
//        + 'existing' - Only update existing row, fail if id is not found
//        + 'always' (default) - create or update
// 
// ### Example which creates a new record
// 
//     // The following adds a new record as no primary key id was specified
//     save(
//       schema.users,
//       {
//         name: 'mark',
//         role: { value: 'admin' },
//         country: { value: 'Lithuania' }
//       },
//       function (err) { ... });
// 
// ### Example which saves to existing record, or creates new one if not found
// 
//     // The following will update an existing record if the id already
//     // exists in the table, otherwise it will insert a new record
//     save(
//       schema.users,
//       {
//         id: 1,
//         name: 'mark',
//         role: { value: 'admin' },
//         country: { value: 'Lithuania' }
//       },
//       function (err) { ... });
// 
ORM.prototype.save = function () {
	var args = parse_args(this, arguments);
	var query = args.query;
	var table = args.table;
	var originalRow = args.data;
	var options = args.options;
	var callback = args.callback;
	var self = this;
	var row = _(originalRow).clone();
	async.waterfall([
			function (callback) {
				/* Serialize */
				_(table).keys().forEach(function (key) {
					if (table[key].serialize) {
						row[key] = table[key].serialize(row[key]);
					}
				});
				/* Lookup reference IDs */
				self.lookupForeignIds(query, table, row, function (err, res) {
						row = res;
						callback(err);
					});
			},
			function (callback) {
				var saveMode = options.save || 'always';
				if (saveMode === 'always') {
					async.parallel([
							async.apply(sql.insertInto, self, table),
							async.apply(sql.set, self, names(row), row),
							async.apply(sql.onDuplicateKeyUpdate, self,
								_(names(row)).without(table.$primary))
						],
						function (err, data) {
							if (err) {
								return callback(err);
							}
							execQuery(data.join('\n'));
						});
				}
				else if (saveMode === 'new') {
					async.parallel([
							async.apply(sql.insertInto, self, table),
							async.apply(sql.set, self, names(row), row),
						],
						function (err, data) {
							if (err) {
								return callback(err);
							}
							execQuery(data.join('\n'));
						});
				}
				else if (saveMode === 'existing') {
					if (table.$primary.length === 0) {
						return callback(new Error('Cannot save to existing ' +
							'row: table has no primary key'));
					}
					var criteria = _(row).pick(table.$primary);
					async.parallel([
							async.apply(sql.update, self, table),
							async.apply(sql.set, self, _(names(row)).without(table.$primary), row),
							async.apply(sql.where, self, query, table, criteria)
						],
						function (err, data) {
							if (err) {
								return callback(err);
							}
							execQuery(data.join('\n'));
						});
				}
				else {
					return callback(new Error('Unknown save mode: ' + saveMode));
				}
				/* Executes the query */
				function execQuery(sql) {
					query(sql, null, function (err, res) {
						if (err) {
							return callback(err);
						}
						if (res.affectedRows === 0) {
							return callback(new Error('Failed to save row ' +
								'with mode ' + saveMode));
						}
						if (_(res).has('insertId')) {
							originalRow[table.$auto_increment] = res.insertId;
						}
						callback(err);
					});
				}
			}
		],
		function (err) { callback(err); });
};

// 
// saveMany([query] table rows [options] callback)
// --------
// 
// Resolves foreign key values and saves sets of rows to the database
// 
// Saves a load of rows to the table, updating when the primary key value
// matches an existing row and inserting otherwise.  Foreign key values are
// looked up automatically.  Internally, this calls save.
// 
//  + table - A table definition from the schema.
//  + rows - An array of rows to save.  Foreign key values are resolved, see the
//    foreign-keys module for more information.
//  + options - see documentation for save()
// 
// ### Example
// 
//     saveMany(
//       schema.users,
//       [
//         {
//           id: 1,
//           name: 'mark',
//           country: { value: 'United Kingdom' },
//           role: { value: 'admin' }
//         },
//         {
//           id: 2,
//           name: 'marili',
//           country: { value: 'Estonia' },
//           role: { value: 'ploom' },
//         },
//       ],
//       { save: 'existing' },
//       function (err) { .. });
// 
ORM.prototype.saveMany = function () {
	var args = parse_args(this, arguments);
	var query = args.query;
	var table = args.table;
	var rows = args.data;
	var options = args.options;
	var callback = args.callback;
	var self = this;
	async.each(rows,
		function (row, callback) {
			self.save(query, table, row, options, callback);
		},
		function (err) { callback(err); });
};

// 
// saveMultipleTables(data, callback)
// ------------------
// 
// Save sets of rows to several tables, looking up foreign keys where needed.
// 
//  + data - An object of the form { tableName: rows, tableName: rows, ... }.
//    
// Note: tables are procesed in the order that their fields appear in the data
// object.  This relies on V8 honouring field order, which ECMAScript specs do
// not require it to do.  This also makes circular dependencies on foreign keys
// impossible to process with a single call to this function.  Internally, this
// calls saveMany.
// 
// ### Example
// 
//     saveMultipletables(
//       {
//         countries: [
//           { id: 44, name: 'United Kingdom' },
//           { id: 372, name: 'Estonia' }],
//         roles: [
//           { name: 'admin', rights: '*' },
//           { name: 'ploom', rights: 'being_awesome,being_a_ploom' }],
//         users: [
//           { 
//             name: 'mark',
//             country: { name: 'United Kingdom' },
//             role: { name: 'admin' }
//           },
//           {
//             name: 'marili',
//             country: { name: 'Estonia' },
//             role: { name: 'ploom' }
//           }]
//       },
//       function (err) { ... });
// 
ORM.prototype.saveMultipleTables = function (data, callback) {
	var self = this;
	this.beginTransaction(function (err, transaction) {
		if (err) {
			return callback(err);
		}
		async.series([
				function (callback) {
					async.eachSeries(names(data),
						function (tableName, callback) {
							if (data[tableName]) {
								self.saveMany(transaction.query, tableName, data[tableName], callback);
							}
						},
						callback);
				},
				transaction.commit
			],
			function (err) {
				if (err) {
					return transaction.rollback(function () { callback(err); });
				}
				callback(null);
			});
	});
};
