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

var cli = require('cli-color');

var ORM = { prototype: {} };
module.exports = ORM.prototype;

// beginTransaction(callback)
// ----------------
// 
// Acquires a connection [from the pool if pooled] and begins a transaction
// 
// The connection is released back to the pool after rollback or after a
// successful commit [if pooled].
// 
// callback = function (err, { connection, query, commit, rollback })
// 
//  + connection: database connection
//  + query: connection.query (tapped for logging)
//  + commit: function (callback(err))
//  + rollback function (callback(err))
// 
ORM.prototype.beginTransaction = function (callback) {
	var self = this;
	var pooled = this.connection.getConnection;
	if (pooled) {
		this.connection.getConnection(gotConnection);
	}
	else {
		gotConnection(this.conncetion);
	}
	function gotConnection(err, connection) {
		if (err) {
			return callback(err);
		}
		connection.beginTransaction(function (err) {
			if (err) {
				return callback(err);
			}
			var transaction = {};
			transaction.connection = connection;
			transaction.query = self.loggedQuery(connection);
			transaction.released = false;
			transaction.release = function () {
				if (!pooled) {
					return self.info('Attempted to release a connection that isn\'t pooled');
				}
				if (transaction.released) {
					return self.warn('Attempted to release an already released connection');
				}
				connection.release();
				transaction.released = true;
			};
			transaction.commit = function (callback) {
				self.info(transaction.query._msg(cli.cyan('Commit transaction')));
				connection.commit(function (err) {
					if (err) {
						self.warn(transaction.query._msg('Commit failed: ' + err));
						return callback(err);
					}
					transaction.release();
					callback(null);
				});
			};
			transaction.rollback = function (callback) {
				self.info(transaction.query._msg(cli.cyan('Rollback transaction')));
				connection.rollback(function (err) {
					transaction.release();
					if (err) {
						self.warn(transaction.query._msg('Rollback failed: ' + err));
						return callback(err);
					}
					callback(null);
				});
			};
			self.info(transaction.query._msg(cli.cyan('Begin transaction')));
			callback(null, transaction);
		});
	}
};
