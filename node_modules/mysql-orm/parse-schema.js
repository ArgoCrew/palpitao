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

// parse-schema
// ============
//
// This module is used internally, you should never need to call it yourself.
//

// parse_schema
// ------------
// Parses the schema and validates some aspects of it:
//  + Resolves type aliases in `schema.$types` and in `field.type`.
//  + Resolves references in `field.type` and `field.references`.
//  + Resolves types for implicit references
//  + Generates names for keys (index/unique) if none was explicity specified.
//  + Generates names for foreign keys, stores in `field.$fkname`.
//  + Stores looked-up type in `field.$type`; `field.type` may be overwritten
//    for implicit references by the type of the referred field.
//
module.exports.parse_schema = parse_schema;
function parse_schema(orm) {
	var schema = orm.schema;
	/* Resolve aliases */
	names(schema.$types).forEach(function resolve_alias(alias) {
		var type = schema.$types[alias];
		while (_(schema.$types).has(type) && schema.$types[type] !== type) {
			type = schema.$types[type];
			if (type === alias) {
				return orm.error('Circular type alias dependency for "' +
					alias + '"');
			}
		}
		schema.$types[alias] = type;
	});
	var implicit_refs = [], all_refs = [];
	/* Process fields */
	names(schema).forEach(function parse_table(tableName) {
		var table = schema[tableName];
		names(table).forEach(function parse_field(fieldName) {
			var field = table[fieldName];
			/* Resolve aliases */
			if (_(orm.schema.$types).has(field.type)) {
				field.type = orm.schema.$types[field.type];
			}
			/* Store resolved type */
			field.$type = field.type;
			/* Builtin primary key type */
			if (field.type === '::id') {
				field.type = 'INTEGER';
				field.auto_increment = true;
				if (table.$primary.length > 0 &&
					!((table.$primary).length === 1
						&& table.$primary[0] === fieldName)) {
					return orm.error('Cannot parse field "' + field.$fullname +
						'": table "' + table.$fullname + '" already has ' +
						'primary key(s) specified');
				}
				table.$primary = [fieldName];
			}
			/* JSON field */
			var match = field.type.match(/^JSON(?:\(\s*(\d+)\s*\))?$/i);
			if (match) {
				field.type = match[1] ? 'VARCHAR(' + match[1] + ')' : 'LONGTEXT';
				field.serialize = function (o) {
					return JSON.stringify(_(o).isUndefined() ? this.default : o);
				};
				field.deserialize = function (s) {
					return (s === null || s === '') ? this.default : JSON.parse(s);
				};
			}
			/* Auto-increment */
			if (field.auto_increment) {
				table.$auto_increment = fieldName;
			}
			/* Implicit references */
			if (field.type.charAt(0) === ':') {
				if (_(field).references) {
					return orm.error('Cannot parse type "' + field.type +
						'" of field "' + field.$fullname + '": a reference ' +
						'already exists in this field\'s definition');
				}
				field.references = field.type.substr(1);
				delete field.type;
				implicit_refs.push(field);
			}
			/* Explicit references */
			if (field.references) {
				all_refs.push(field);
			}
			/* Index */
			if (field.index && !_(field.index).isString()) {
				field.index = field.$name + '_idx';
			}
			/* Unique key */
			if (field.unique && !_(field.unique).isString()) {
				field.unique = field.$name + '_uniq';
			}
			/* Reference options */
			if (field.references) {
				field.onUpdate = reference_option(orm,
					_(field.onUpdate).isString() ? field.onUpdate : 'restrict');
				field.onDelete = reference_option(orm,
					_(field.onDelete).isString() ? field.onDelete : 'restrict');
			}
		});
	});
	/* Resolve references */
	all_refs.forEach(function (field) {
		if (_(field.references).isString()) {
			field.references = resolve_field(orm, field.$fullname,
				field.references);
		}
	});
	/* Generate FK constraint names */
	all_refs.forEach(function (field) {
		field.$fkname = [
				field.$name, 'fk', field.references.$table.$name,
				field.references.$name
			].join('_');
	});
	/* Resolve data types for implicit references */
	var unresolved_implicit_refs = implicit_refs.length;
	while (unresolved_implicit_refs > 0) {
		if (!_(implicit_refs).some(
			function resolveSome(field) {
				if (!_(field).has('type') && _(field.references).has('type')) {
					field.type = field.references.type;
					unresolved_implicit_refs--;
					return true;
				}
				return false;
			})) {
			return orm.error('Failed to resolve references: Do you have a ' +
				'circular dependency between implicitly typed reference ' +
				'fields?  fields: ' +
				_(implicit_refs).pluck('$fullname').join(', '));
		}
	}
}

// resolve_field
// -------------
// Gets a field definition from a string naming the field (e.g. table.field)
//
function resolve_field(orm, fullname, str) {
	var err = function (msg) {
		return 'Failed to resolve field "' + str + '" for field "' + fullname +
			'": ' + msg;
	};
	var path = str.split('.');
	if (path.length > 2) {
		return orm.error(err('Format: <table name>.<field name>'));
	}
	var table = path.shift();
	if (table.charAt(0) === '$' || !_(orm.schema).has(table)) {
		return orm.error(err('Table ' + mysql.escapeId(table) + ' not found'));
	}
	var field = path.shift();
	if (_(field).isUndefined()) {
		if (orm.schema[table].$primary.length > 1) {
			return orm.error(err('Target table "' + table + '" has a ' +
				'composite primary key and no target field was explicitly ' +
				'specified in the relation definition'));
		} else
		if (orm.schema[table].$primary.length === 0) {
			return orm.error(err('No field was specified and the target ' +
				'table "' + table + '" has no primary key defined to use as ' +
				'default'));
		}
		field = orm.schema[table].$primary[0];
	}
	if (field.charAt(0) === '$' || !_(orm.schema[table]).has(field)) {
		return orm.error(err('Field ' + mysql.escapeId(field) + ' was not ' +
			'found in table ' +	mysql.escapeId(table)));
	}
	return orm.schema[table][field];
}

// reference_option
// ----------------
// Helper function to parse reference_option values
//
function reference_option(orm, value) {
	value = value.toUpperCase();
	if (!_(['RESTRICT', 'CASCADE', 'SET NULL', 'NO ACTION']).contains(value)) {
		orm.warn('unrecognised reference_option: ' + value);
	}
	return value;
}
