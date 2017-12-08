mysql-orm [![Build Status](https://travis-ci.org/battlesnake/node-mysql-orm.svg?branch=master)](https://travis-ci.org/battlesnake/node-mysql-orm) [![NPM version](https://badge.fury.io/js/mysql-orm.svg)](http://badge.fury.io/js/mysql-orm)
==============

For node.js: MySQL wrapper providing object mapping, automatic table generation via JSON schema, automatic foreign key generation and resolution, indexes, default values, reference options and more.

A test is given in the `./tests/` folder, which should demonstrate most of the core functionality.  The components of this module (`load.js`, `read.js`, etc) are documented too, giving considerably more detail than this README.  Inline documentation is provided in the source files, and HTML versions in the docs/ folder.

I recommend using the HTML documentation rather than the documentation below, as the HTML documentation is up-to-date.

# Install

```sh
$ npm install mysql-orm
```

# Simple example:

## 1. Define a schema

```node
/* Define a schema */
var schema = {

	/* User-defined type aliases */
	$types: {
		/* Name begins with colon -> foreign key to some table */
		'user': ':users',
		'role': ':roles',
		'string': 'varchar(64)',
		'password': 'char(60)',
		'boolean': 'bit',
		/* A field of type "country" would be a foreign key to table "countries" */
		'country': ':countries'
	},

	users: {
		/* "id" field is generated automatically */
		/*
		 * Dollar-prefix is used for metadata, e.g. specifying the
		 * default sort order
		 */
		$sort: '+username',
		/* This field must have a unique value (unique: true) */
		username: { type: 'string', unique: true },
		password: { type: 'password' },
		role: { type: 'role' },
		lastactive: { type: 'timestamp' },
		country: { type: 'country' }
	},

	roles: {
		name: { type: 'string', unique: true },
		rights: { type: 'string' }
	},

	posts: {
		/*
		 * Prefix a sort field by + or - to explicitly set ascending
		 * or descending sort order
		 */
		$sort: '-date',
		/*
		 * Set the ON UPDATE and ON DELETE actions for foreign key
		 * constraint
		 */
		user: { type: 'user', onDelete: 'cascade', onUpdate: 'cascade' },
		/* Index this field (index: true) */
		title: { type: 'string', index: true },
		content: { type: 'text' },
		date: { type: 'timestamp' },
		deleted: { type: 'boolean' }
	},

	countries: {
		$sort: '+name',
		name: { type: 'string', index: true }
	}

};
```

## 2. Define the initial dataset (optional)

```node
/* 
 * Define the initial contents of the database (optional)
 *
 * V8 preserves field order - which is useful since some tables depend on
 * content in others
 *
 * Tables are processed in the order that they appear in this object
 */
var data = {

	roles: [
		{ name: 'admin', rights: '*' },
		{ name: 'ploom', rights: 'being a ploom' },
		{ name: 'pleb', rights: 'lol' }
	],

	/*
	 * The auto_increment primary key `id` field is created automatically for
	 * each table
	 */
	countries: [
		{ id: 44, name: 'United Kingdom' },
		{ id: 372, name: 'Estonia' },
		/* Lithuania was the largest country in Europe at one point */
		{ id: 370, name: 'Lithuania' },
		{ id: 7, name: 'Russia' }
	],

	users: [
		/*
		 * We don't know what ID values the roles will have and we didn't
		 * explicitly specify them, but we can use the automatic foreign-key
		 * lookup to specify roles by name instead.  Such search constraints
		 * must resolve to one and only one record in the parent table.
		 * Automatic lookup is also used for the country field.  Easy!
		 */
		{ username: 'mark', password: Array(61).join('\0'), role: { name: 'admin' }, country: { name: 'Estonia' } },
		{ username: 'marili', password: Array(61).join('\0'), role: { name: 'ploom' }, country: { name: 'Estonia' } }
	],

	posts: [
		{ user: { username: 'mark' }, title: 'Test post', content: 'This is a test post', deleted: false }
	]

};
```

## 3. Specify the MySQL database parameters

```node
/* See https://github.com/felixge/node-mysql for more information */

var mysql_params = {
	host: 'localhost',
	user: 'username',
	password: 'password'
};

/*
 * NOTE: The user must have SELECT, UPDATE, DELETE, etc rights to the
 * database specified in the next section
 */
```

## 4. Specify options for the ORM

```node
var orm_options = {
	mysql: mysql_params,
	/*
	 * Database name.  User specified in previous section MUST have
	 * relevant rights to this database.
	 */
	database: 'mysql-orm-test',
	/*
	 * CAUTION: Setting this to true will drop the database then recreate
	 * it
	 */
	recreateDatabase: false,
	/*
	 * CAUTION: Setting this to true will drop the tables mentioned in
	 * the schema then recreate them
	 */
	recreateTables: false,
	/* Causes an annoying delay between each line output by ORM's logger */
	debug: process.env.DEBUG,
	/*
	 * Log level (1,2,3=FAIL/WARN/INFO).  See logging.js for more info.
	 * Level 2 (WARN) is default.
	 */
	logLevel: 2
};
```

## 5. Create the ORM

This will create the database if it does not exist and create the tables if they do not exist.
If `recreateTables` or `recreateDatabase` is specified, then the `data` will be added to the database.
Note that this will not occur if the tables/database are created but the `recreate*` parameters were not set.
CAUTION: `recreateTables` / `recreateDatabase` are for development purposes only, they WILL cause orm to drop the database and tables if they already exist.

If `skipChecks` is `true` in the options, mysql-orm will not check for existence of the database or the tables, will not regenerate them even if `recreate*` are set, and it will return synchronously.

```node
var mysql_orm = require('mysql_orm');
var orm = null;

mysql_orm.create(schema, data, orm_options, function (err, ormObject) {
	if (err) {
		throw err;
	}
	orm = ormObject;
});
```

## Once the callback has returned the orm object, we're good to go!

### Reading (loading records from the database)

```node
/*
 * loadMany: Read multiple records from a table
 *
 * Specify the table by reference in the schema, or as a string
 * e.g. 'countries'
 */
orm.loadMany(orm.schema.countries, null, function (err, countries) {
	if (err) {
		throw err;
	}
	countries.forEach(function (country) { console.write(country.name });
});

/*
 * load: Retrieve one record, return error if none were found or
 * if several were found
 */
orm.load(orm.schema.users, 1, function (err, user) {
	console.log(user.name + ' is in ' + user.country.name);
});
/*
 * Oh did you notice that the `country` is automatically looked
 * up there?  Awesome!
 */

/*
 * The second parameter of load / loadMany can also be an object
 * containing search criteria
 */
orm.loadMany(orm.schema.users, { country: { name: 'Estonia' } }, callback);
/* We specified a value in a parent table as the search criteria :) */
```

### Writing (saving records to the database)

```node
/* Load a record, modify it, save it */
orm.load(orm.schema.users, { name: 'mark' }, function (err, user) {
	if (err) throw err;
	user.role = { name: 'pleb' };
	orm.save(orm.schema.users, user, function (err) {
		if (err) throw err;
		console.log('User "mark" is now a pleb');
	});
});

/*
 * We could also do this instead, if we knew the user's ID.  If the id
 * is not specified, save() will create a new user and set the id field
 * of the passed object to the new id returned from MySQL.
 */
orm.save(orm.schema.users, { id: 1, role: { name: 'pleb' } }, function (err) {
	if (err) throw err;
	console.log('User "mark" is now a pleb');
});

/*
 * When inserting new items with no ID specified, the ID field of the
 * passed object is set to the new row's ID in the database.
 */
var guestRole = { name: 'guest', rights: 'read_posts,like_posts' };
orm.save(orm.schema.roles, guestRole, function (err) {
	if (err) throw err;
	console.log('ID of guest role in roles table is ' + guestRole.id);
});

/*
 * Save multiple records to a table
 * This calls save() internally, so can update or create records.
 * See save.js for details of how to explicity request an UPDATE or
 * an INSERT.
 */
orm.saveMany(orm.schema.countries,
	[
		{ id: 358, name: 'Finland' },
		{ id: 46, name: 'Sweden' }
	],
	function (err) {
		...
	});

/*
 * Save to multiple tables.  This calls saveMany() internally and
 * wraps all the saveMany() calls in one transaction
 */
orm.saveMultipleTables(
	{
		countries: [ { id: 40, name: 'Romania' } ],
		users: [ name: 'Dazza', country: { name: 'Romania' }, ... ]
	},
	function (err) {
	});

```

### Deleting data

```node
orm.delete(orm.schema.users, 1, callback);
orm.delete(orm.schema.countries, { name: 'Atlantis' }, callback);
orm.deleteMany(orm.schema.posts, { user: { name: 'Bob' } }, callback);
```

# Debugging
```node
orm.logLevel = 3;
/* Now STDOUT will get flooded by debugging messages and SQL code */

orm.debug = true;
/*
 * Now there will be an annoying blocking delay after each logged
 * message
 *
 * Don't use this in production!
 */

You can also set logLevel and debug in the orm_options parameter.
```

# Coding standards
(for contributors only!  I'm not going all Python at you guys, users!)

 * Single tab for indent.  This way I can have a 4 column indent, while you can enjoy your preferred indent size simply by setting an appropriate tabstop.  Strictly no spaces for indentation of code.

 * require's all have their own var.  This is non-negotiable.  This way there is no disagreement over where commas go as their aren't any, and editing require's is easier.

 * External require's come before internal ones, with a blank line before, after, and between the two blocks.

   ```node

   var mysql = require('mysql');
   var async = require('async');
   var _ = require('underscore');

   var myUtil = require('./myUtil/');
			
   ```

 * No strict rule for indentation of anonymous functions, objects or arrays.  Make it readable and don't waste too many columns.

 * Open brace for control block (`if`/`do`/`while`/`function`/`else`) is ALWAYS on same line as block command.  Close brace never shares its line with code unless the entire block is a `{ one-liner }`.  This includes the brace before `else`, `else` has its own line (although I'm not too bothered by this, as I prefer `} else {` for C/C++ code).

   ```node
   function myFunc(a, b, c) {
   		if (a) {
   			while (b(c--)) { console.log(c); }
   		}
   		else {
   			async_thing(param, function (err, res) {
   				/*
   				 * Indent anonymous functions in any way that is readable
   				 * and doesn't waste a tonne of columnage.
   				 */
   			});
   			/*
   			 * The above close-brace shares a line with bracket, semicolon but
   			 * never with code.
   			 */
   		}
   		/* Objects and arrays... just make it readable and not too wasteful */
   		a = [1, 2, 3,
   				{
   					name: 'four'
   				}];
   		b = [
   			'What is your favourite colour',
   			'What is the velocity of an unladen swallow',
   			'Aaaaaaaaiiiiiiiii'
   		];
   }
   ```

 * Comment are padded by a space.  Multiline comments are padded by a blank comment line.  `//` comments are only used for lit.js documentation and for removing bits of code, never for actual comments.

   ```node
   	/* Single-line comment with a space padding on each side */

   	/*
	 * Multi-line comment with space padding on left
	 * and blank line padding above and below.
	 */
			 
   	//console.log('Only use // for commenting out code.  Padding is not important in this case.');

	//
	// # lit.js documenation
	//
   ```
		
   I prefer the Oxford comma for technical writing, but I'm not too bothered about whether you use it or not.
