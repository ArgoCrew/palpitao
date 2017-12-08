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

// util
// ====
// Internally-used utilities

// indent
// ------
// Indents a multiline string
//
module.exports.indent = function (str) {
	return '\t' + str.replace(/\n/g, '\n\t');
};

// names
// -----
// Get a list of object names within the given object.  Returns all field names
// that don't begin with `$` and that aren't functions.
//
module.exports.names = function (obj) {
	return _(obj).keys().filter(
		function (key) {
			return key.charAt(0) !== '$' && !_(obj[key]).isFunction();
		});
};

// args
// ----
// Arguments parser for:
//
//     function ([query, ] table|field, [criteria, [options, ]] callback)
//
module.exports.parse_args = function (orm, args, wantsField) {
	args = [].slice.apply(args);
	var params = {};
	params.query = (function () {
		return (_(args[0]).isFunction() && args[0].name === 'query') ?
			args.shift() : orm.query;
	})();
	if (wantsField) {
		params.field = (function () {
			return args.shift();
		})();
	}
	else {
		params.table = (function () {
			var table = args.shift();
			if (_(table).isString() && _(orm.schema).has(table)) {
				return orm.schema[table];
			}
			else if (_(table).isObject() && table.$type === 'table' && table.$schema === orm.schema) {
				return table;
			}
			else {
				throw new Error('Cannot resolve table: ' + JSON.stringify(table));
				//return table;
			}
		})();
	}
	params.callback = (function () {
		var callback = args.pop();
		if (!_(callback).isFunction()) {
			throw new Error('Callback is not a function!');
		}
		return callback;
	})();
	params.data = (function () {
		var data = args.shift();
		if (wantsField) {
			return data;
		}
		if (_(data).isNull() || _(data).isUndefined()) {
			return {};
		}
		if (_(data).isString() || _(data).isNumber()) {
			if (params.table.$primary.length !== 1) {
				return callback(new Error('Table "' + params.table.$name +
					'" has no simple primary key, please specify a search ' +
					'key explicitly'));
			}
			return _.object([params.table.$primary[0]], [data]);
		}
		return data;
	})();
	var hasOptions;
	params.options = (function () {
		var options = args.shift();
		hasOptions = !!options && options != {};
		return options || {};
	})();
	params.hasOptions = hasOptions;
	return params;
};
