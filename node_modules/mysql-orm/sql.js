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
var names = utils.names;
var shift = utils.shift;

// sql
// ===
// SQL clause generators
//

// 
// SELECT <fields>
// ------
// 
// `$fields` can contain a mix of field references and field names.
// Defaults to '*' if no fields are specified.
// 
module.exports.select = function (self, fields, callback) {
	if (fields) {
		fields = fields.map(
			function (field) {
				if (field.$type === 'field') {
					return field.$name;
				}
				else {
					return field;
				}
			}
		);
		return callback(null, mysql.format('SELECT ??', [fields]));
	}
	else {
		return callback(null, 'SELECT *');
	}
};

// 
// DELETE
// ------
// 
// No point making this async-style, it can never take parameters.  QUICK and
// IGNORE are irrelevant as performance is not an objective of this package.
// 
// Then again, I like having my clause lists in async.parallel, and as stated,
// performance is not important in this library, so "async style" it is.
// 
module.exports.delete = function (callback) {
	callback(null, 'DELETE');
}

// 
// table name
// ----------
// 
// Table can be a string or a table reference.
// 
function tableName(table, callback) {
	if (_(table).isString()) {
		return callback(null, mysql.escapeId(table));
	}
	else if (table.$type === 'table') {
		return callback(null, mysql.escapeId(table.$name));
	}
	else {
		return callback(new Error('Unknown table specification: "' + table +
			'"'));
	}
}

// 
// INSERT INTO <table name>
// -----------
// 
// Table can be a table reference or a table name.
// 
module.exports.insertInto = function (self, table, callback) {
	tableName(table, function (err, res) {
		if (err) {
			return callback(err);
		}
		callback(null, 'INSERT INTO ' + res);
	});
};

// 
// UPDATE <table name>
// ------
// 
// Table can be a table reference or a table name.
// 
module.exports.update = function (self, table, callback) {
	tableName(table, function (err, res) {
		if (err) {
			return callback(err);
		}
		callback(null, 'UPDATE ' + res);
	});
};

// 
// FROM <table name>
// ----
// 
// Table can be a table reference or a table name.
// 
module.exports.from = function (self, table, callback) {
	tableName(table, function (err, res) {
		if (err) {
			return callback(err);
		}
		callback(null, 'FROM ' + res);
	});
};

// 
// WHERE <criteria>
// -----
// 
// Properties of criteria are used to generate search constraints.  Foreign row
// IDs are looked up where necessary to generate these constraints.
// 
module.exports.where = function (self, query, table, criteria, callback) {
	var cols = _(criteria).keys();
	criteria = _(criteria).clone();
	if (table.$primary.length === 1 && _(criteria).has(table.$primary)) {
		var primary = table.$primary[0];
		criteria = _.object([primary], [criteria[primary]]);
		cols = [primary]
	}
	if (cols.length) {
		if (_(table).isString()) {
			table = self.schema[table];
		}
		var refs = self.listForeignKeys(table);
		if (refs.length) {
			self.lookupForeignIds(query, table, criteria, { cols: cols }, function (err, res) {
				if (err) {
					return callback(err);
				}
				generateClause(res);
			});
		}
		else {
			generateClause(criteria);
		}
	}
	else {
		return callback(null);
	}
	function generateClause(row) {
		cols.forEach(function (fieldName) {
			var field = table[fieldName];
			if (field.serialize) {
				row[fieldName] = field.serialize(row[fieldName]);
			}
		});
		return callback(null,
			'WHERE\n\t' + cols
				.map(function (col) {
					return mysql.format('??=?', [col, row[col]]);
				})
				.join(' AND\n\t'));
	}
};

// 
// ORDER BY <field [direction]>
// --------
// 
// criteria.$sort property, or (as fallback) table.$sort are used to generate
// sorting instructions.  $sort can be a field name/reference or an array of
// such.  Begin field names with +/- to specify ascending or descending sort
// order.
// 
module.exports.orderby = function (self, table, sort, callback) {
	var sort = sort || table.$sort || [];
	if (sort.length) {
		if (_(sort).isString()) {
			sort = [sort];
		}
		return callback(null, 'ORDER BY\n\t' + sort.map(function (field) {
			if (field.$type === 'field') {
				field = field.$name;
			}
			if (!_(field).isString()) {
				return callback(new Error('$sort must either be a field ' +
					'name a field reference, or an array of field ' +
					'names/references'));
			}
			if (field.charAt(0) === '-') {
				return mysql.escapeId(field.substr(1)) + ' DESC';
			}
			else if (field.charAt(0) === '+') {
				return mysql.escapeId(field.substr(1)) + ' ASC';
			}
			else {
				return mysql.escapeId(field);
			}
		}).join(',\n\t'));
	}
	else {
		return callback(null);
	}
};

// 
// LIMIT <count> [OFFSET <start>]
// -----
// 
// Uses a combination of $first, $last and $count to generate a LIMIT clause.
// 
module.exports.limit = function (self, options, callback) {
	var lparams =
		_(options).has('first')?1:0 +
		_(options).has('count')?2:0 +
		_(options).has('last') ?4:0;
	var first = options.first, last = options.last, count = options.count;
	switch (lparams) {
		case 0: return callback(null);
		case 1: return callback(new Error('first value for LIMIT specified, but no last or count value'));
		case 2: return callback(null, mysql.format('LIMIT ?', [count])); break;
		case 3: return callback(null, mysql.format('LIMIT ?\nOFFSET ?', [count, first])); break;
		case 4:	return callback(new Error('last value for LIMIT specified, but no first or count value'));
		case 5: return callback(null, mysql.format('LIMIT ?\nOFFSET ?', [last - first, first])); break;
		case 6: return callback(null, mysql.format('LIMIT ?\nOFFSET ?', [count, last - count])); break;
		case 7: return callback(new Error('first, last, count were all specified for LIMIT'));
	}
};

// 
// ON DUPLICATE KEY UPDATE <name = VALUES(name), ...>
// -----------------------
// 
// Generates a list of copy assignments
// 
module.exports.onDuplicateKeyUpdate = function (self, keys, callback) {
	callback(null,
		'ON DUPLICATE KEY UPDATE\n\t' + keys.map(
			function (key) {
				return mysql.format('?? = VALUES(??)', [key, key]);
			}
		).join(',\n\t'));
};

// 
// SET <name = value, ...>
// ---
// 
// Generates a list of assignments
// 
module.exports.set = function (self, keys, row, callback) {
	if (!keys) {
		keys = names(row);
	}
	callback(null,
		'SET\n\t' + keys.map(
			function (key) {
				return mysql.format('?? = ?', [key, row[key]]);
			}
		).join(',\n\t'));
};
