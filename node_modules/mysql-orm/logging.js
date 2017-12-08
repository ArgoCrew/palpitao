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

// logging
// =======
// Colourful logging for mysql-orm
//

// 
// logLevel: int
// --------
// 
// Sets the logging level.
//  + 0: all messages are ignored including fatal errors.  Do not use this
//    level.
//  + 1: only fatal errors are logged (and are also thrown).
//  + 2: warnings are also logged.
//  + 3: info is also logged.
//  + 4: for those who use CFLAGS="-O99" because "-O98" code is just too slow.
// 
// ### Default
// 
//     logLevel = 2
// 
ORM.prototype.logLevel = 2;

/* Used in DEBUG mode only, quit whining already */
function sleep(delay) {
	/*
	 * OMG, a blocking operation in node.js, the developer of this package
	 * must be such a useless n00b right?  Just like those damn kernel
	 * developers who use `goto`...
	 */
	var stop = new Date().getTime() + delay;
	while (new Date().getTime() < stop) ;
}

// 
// log(level, msg)
// ---
// 
// Logging with pretty colours
// 
// Logs a message at a custom level
// 
// ### Example
// 
//     log(cli.olive('POTATO'), 'I am a potato');
// 
ORM.prototype.log = function (level, msg) {
	console.log(cli.green('mysql-orm') + ' ' + level + ' ' + msg);
	if (this.debug) sleep(50);
	return msg;
}

// 
// error(msg)
// -----
// 
// **Throws an exception**
// 
// Logs the given message at FAIL level, then throws it as an Error, if
// logLevel >= 1.  If logLevel !>= 1, stuff will go horribly wrong.
// 
// ### Example
// 
//     error('Access denied to backend database');
// 
ORM.prototype.error = function (msg) {
	if (this.logLevel >= 1) {
		this.log(cli.red.bold('FAIL'), msg);
		throw (msg instanceof Error ? msg : new Error(msg));
	}
	if (this.debug) sleep(500);
	return msg;
}

// 
// warn(msg)
// ----
// 
// Logs the given message at WARN level.
// 
// ### Example
// 
//     warn('dropTables specified, dropping all tables');
// 
ORM.prototype.warn = function (msg) {
	if (this.logLevel >= 2) {
		this.log(cli.yellow('WARN'), msg);
	}
	if (this.debug) sleep(250);
	return msg;
}

// 
// info(msg)
// ----
// 
// Logs the given message at INFO level.
// 
// ### Example
// 
//     info('Executing query ' + sql);
// 
ORM.prototype.info = function (msg) {
	if (this.logLevel >= 3) {
		this.log(cli.cyan('INFO'), msg);
	}
	return msg;
}

// 
// test(msg)
// ----
// 
// Logs the given message at TEST level.
// 
// ### Example
// 
//     test('Running test #32');
// 
ORM.prototype.test = function (msg) {
	this.log(cli.magenta('TEST'), msg);
	return msg;
}
