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
var indent = utils.indent;

// autogen
// ==========
//
// This module is used internally, you should never need to call it yourself.
//

// create_database
// ---------------
// Creates the database if needed or if recreate is requested
//
module.exports.create_database = create_database;
function create_database(orm, recreate, callback) {
	var queries = [];
	if (recreate) {
		orm.warn('Recreate is specified: dropping database ' + orm.database);
		queries.push(mysql.format('DROP DATABASE IF EXISTS ??', [orm.database]));
	}
	queries.push(mysql.format('CREATE DATABASE IF NOT EXISTS ??', [orm.database]));
	queries.push(mysql.format('USE ??', [orm.database]));
	/* Generate query executing functions from SQL commands */
	queries = queries.map(function (sql) {
		return function (callback) {
			orm.query(sql, null, callback);
		};
	});
	/* Execute queries */
	async.series(queries, callback);
};

// create_tables
// -------------
// Creates the tables if needed or if recreate is requested
module.exports.create_tables = create_tables;
function create_tables(orm, recreate, callback) {
	var queries = [];
	/* Generate list of SQL commands */
	queries.push('SET FOREIGN_KEY_CHECKS = 0');
	if (recreate) {
		var tables = names(orm.schema);
		orm.warn('Recreate is specified: dropping tables ' + tables.join(', '));
		if (tables.length) {
			queries.push(mysql.format('DROP TABLE IF EXISTS ??', [tables]));
		}
	}
	names(orm.schema).forEach(function (tableName) {
		queries.push(create_table(orm, orm.schema[tableName]));
	});
	queries.push('SET FOREIGN_KEY_CHECKS = 1');
	/* Execute queries */
	async.series(
		queries.map(function (sql) {
			return async.apply(orm.query, sql, null);
		}),
		callback);
}

// create_table
// ------------
// Generates a CREATE TABLE query for the given table definition
//
function create_table(orm, table) {
	var columns = [];
	names(table).forEach(function (fieldName) {
		columns.push(column_definition(orm, table[fieldName]));
	});
	if (table.$primary && table.$primary.length) {
		columns.push(mysql.format('PRIMARY KEY (??)', [table.$primary]));
	}
	var lines = [];
	lines.push(mysql.format('CREATE TABLE IF NOT EXISTS ?? (', table.$name));
	lines.push(indent(columns.join(',\n')));
	lines.push(');');
	return lines.join('\n');
}

// column_definition
// -----------------
// Generates column_definition clauses for CREATE_TABLE
//
function column_definition(orm, field) {
	var lines = [];
	if (field.index) {
		lines.push(['INDEX ?? (??)', [field.index, field.$name]]);
	}
	if (field.unique) {
		lines.push(['CONSTRAINT ?? UNIQUE KEY (??)', [field.unique, field.$name]]);
	}
	if (field.references) {
		lines.push([[
			'CONSTRAINT ?? FOREIGN KEY (??)',
			'REFERENCES ?? (??)',
			'ON UPDATE ' + field.onUpdate,
			'ON DELETE ' + field.onDelete].join('\n\t'),
			[field.$fkname, field.$name, field.references.$table.$name,
			field.references.$name]]);
	}
	lines = lines
		.map(function (ar) { return mysql.format.apply(mysql, ar); })
		.map(indent);
	var def = field.default;
	if (_(field).has('default') && field.serialize) {
		def = field.serialize(def);
	}
	lines.unshift(_([
		mysql.escapeId(field.$name),
		field.type,
		field.auto_increment && 'AUTO_INCREMENT',
		!field.nullable && 'NOT NULL',
		field.default && ('DEFAULT ' + mysql.escape(def))
	]).compact().join(' '));
	return lines.join(',\n');
};
