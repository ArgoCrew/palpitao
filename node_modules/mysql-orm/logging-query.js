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
var cli = require('cli-color');
var _ = require('underscore');

var utils = require('./utils');
var indent = utils.indent;

var ORM = { prototype: {} };
module.exports = ORM.prototype;

// logging-query
// =============
// Makes query diagnostics really easy
//

// 
// loggedQuery(connection)
// -----------
// 
// Query logging
// 
// Creates a wrapper around a pool/connection query function
// 
// query is function with same signatures as mysql's connection.query
// 
// Each call to loggedQuery generated a logging function with a different cid
// value.  Each call to the returned query function increases the qid value
// associated with that cid.
// 
// ### Example
//     query = loggedQuery(connection)
// 
var cid_static = 0;
ORM.prototype.loggedQuery = function (connection) {
	var qid_static = 0;
	var cid = String(cid_static++);
	var self = this;
	function query(query_format, params, callback) {
		var qid = String(qid_static++);
		var qidstr = cli.magenta('cid:' + cid + ', qid:' + qid) + Array((cid + qid).length < 6 ? 6 - (cid + qid).length : 1).join(' ');
		var log = function (left, value) {
			self.info(qidstr + left + (value.indexOf('\n') === -1 ? value : '\n' + indent(value).replace(/\t/g, '    ')));
		};
		var sql = mysql.format(query_format, params);
		if (!_(query_format).isString() || params) {
			log('query  = ', (_(query_format).isString() ? query_format : JSON.stringify(query_format)));
			log('params = ', JSON.stringify(params));
			log('sql    = ', sql);
		}
		else {
			log('sql = ', sql);
		}
		connection.query(sql, function (err) {
			if (err) {
				self[self.ready ? 'warn' : 'error'](qidstr + 'error = ' + JSON.stringify(err) + '; sql=\n' + indent(sql));
			}
			callback.apply(null, arguments);
		});
	};
	query._cid = cid;
	query._msg = function (str) {
		return cli.magenta('cid:' + cid + '     ') + Array(cid.length < 6 ? 6 - cid.length : 1).join(' ') + ' ' + str;
	};
	return query;
};
