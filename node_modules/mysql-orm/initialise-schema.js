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

// initialise-schema
// =================
//
// This module is used internally, you should never need to call it yourself.
//

// initialise_schema
// -----------------
// Initialises the schema:
//  + Adds references to parent items.
//  + Stores the name of each item into the item itself.
//  + Creates primary key field `id` on tables with no `id` field and no
//    primary key.  Set `table.$primary = []` to disable creation of automatic
//    primary key field.
//  + Expands shorthand string definitions to object definitions.
//
// TODO: Define prototypes instead of assigning $type to each one
//
module.exports.initialise_schema = initialise_schema;
function initialise_schema(orm) {
	var schema = orm.schema;
	schema.$name = orm.database;
	schema.$orm = orm;
	schema.$fullname = '(' + orm.database + ')';
	schema.$type = 'schema';
	names(schema).forEach(function initialise_table(tableName) {
		orm.info('schema ' + tableName);
		var table = schema[tableName];
		table.$name = tableName;
		table.$schema = schema;
		table.$fullname = mysql.escapeId(tableName);
		table.$type = 'table';
		if (!_(table).has('id') && !_(table).has('$primary')) {
			table.id = { type: '::id' };
			table.$primary = 'id';
		}
		if (_(table.$primary).isString()) {
			table.$primary = [table.$primary];
		}
		table.$primary = table.$primary || [];
		names(table).forEach(function initialise_field(fieldName) {
			orm.info('schema ' + Array(tableName.length + 1).join(' ') + '.' +
				fieldName);
			var fullname = mysql.escapeId(tableName) + '.' +
				mysql.escapeId(fieldName);
			if (_(table[fieldName]).isString()) {
				table[fieldName] = expand_field_shorthand_definition(orm,
					fullname, table[fieldName]);
			}
			var field = table[fieldName];
			field.$name = fieldName;
			field.$table = table;
			field.$schema = schema;
			field.$fullname = fullname;
			field.$type = 'field';
		});
	});
}

// expand_field_shorthand_definition
// ---------------------------------
// Generates a field definition object from a shorthand string definition
//
// Format: `'type[,unique][,index][,nullable][,cascade][,auto_increment]'`
//
// Order of items does not matter except `type`, which must be first.
//
function expand_field_shorthand_definition(orm, fullname, def) {
	var err = function (msg) {
		return 'Failed to process field definition "' + def + '" for field ' +
			fullname + ': ' + msg;
	};
	var f = def.split(',').map(function (s) { return s.trim(); });
	function flag(name) {
		var idx = f.indexOf(name);
		if (idx === -1) {
			return false;
		}
		else {
			f.splice(idx, 1);
			return true;
		}
	}
	if (f.length === 0) {
		return orm.error(err('No type found'));
	}
	field = {};
	field.type = f.shift();
	field.unique = flag('unique');
	field.index = flag('index');
	field.nullable = flag('nullable');
	field.auto_increment = flag('auto_increment');
	if (flag('cascade')) {
		field.onDelete = 'cascade';
		field.onUpdate = 'cascade';
	}
	f = _(f).compact();
	if (f.length) {
		return orm.error(err('Residue: ' + f.join(',')));
	}
	return field;
}
