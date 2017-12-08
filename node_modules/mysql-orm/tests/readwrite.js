'use strict';

/*
 * MySQL object-relational mapping
 *
 * (C) 2014 Mark K Cowan, mark@battlesnake.co.uk
 *
 * Released under `GNU General Public License, Version 2`
 *
 */

/*
 * Read / write tests
 */

var mysql = require('mysql');
var async = require('async');
var _ = require('underscore');

module.exports = function (orm ,callback) {
	async.waterfall([
		function (callback) {
			orm.loadMany(orm.schema.countries, null, callback);
		},
		function (countries, callback) {
			orm.test('Countries');
			countries.forEach(function (country) {
				console.log(country.id + ': \t' + country.name);
			});
			console.log('');
			callback(null);
		},
		function (callback) {
			orm.loadMany(orm.schema.users, null, callback);
		},
		function (users, callback) {
			orm.test('Users (country)');
			users.forEach(function (user) {
				console.log(user.username + ' (' + user.country.name + ')');
			});
			console.log('');
			callback(null);
		},
		function (callback) {
			orm.loadMany(orm.schema.users, { country: { name: 'Estonia' } }, callback);
		},
		function (users, callback) {
			orm.test('Users in Estonia');
			users.forEach(function (user) {
				console.log(user.username);
			});
			console.log('');
			callback(null);
		},
		function (callback) {
			orm.load(orm.schema.users, 1, callback);
		},
		function (user, callback) {
			orm.test('Retrieved user #1:');
			console.log(user);

			orm.test('Setting user role to "pleb"');
			user.role = { name: 'pleb' };
			orm.save(orm.schema.users, user, callback);
		},
		function (callback) {
			orm.load(orm.schema.users, 1, callback);
		},
		function (user, callback) {
			orm.test('Retrieved user #1:');
			console.log(user);
			if (user.role.name !== 'pleb') {
				return callback(new Error('User role was not set successfully'));
			}

			orm.test('Setting user country to "United Kingdom" via raw ID value');
			user.country = 44;
			orm.save(orm.schema.users, user, callback);
		},
		function (callback) {
			orm.load(orm.schema.users, 1, callback);
		},
		function (user, callback) {
			orm.test('Retrieved user #1:');
			console.log(user);
			if (user.country.name !== 'United Kingdom') {
				return callback(new Error('User country was not set successfully'));
			}

			orm.test('Replacing country "United Kingdom" with "Scottish Federation"');
			orm.save(orm.schema.countries, { id: 44, name: 'Scottish Federation' }, { save: 'existing' }, callback);
		},
		function (callback) {
			orm.load(orm.schema.users, 1, callback);
		},
		function (user, callback) {
			orm.test('Retrieved user #1:');
			console.log(user);
			if (user.country.name !== 'Scottish Federation') {
				return callback(new Error('Country name was not set successfully'));
			}

			callback(null);
		},
		function (callback) {
			orm.delete(orm.schema.users, 1, callback);
		},
		function (count, callback) {
			if (count) {
				orm.test('Deleted user #1');
				callback(null);
			}
			else {
				callback(new Error('Failed to delete user #1'));
			}
		},
		function (callback) {
			orm.loadMany(orm.schema.users, null, callback);
		},
		function (users, callback) {
			orm.test('Remaining users:');
			console.log(users.map(function (user) { return user.name; }).join(', '));

			orm.test('Removing Scottish Federation from countries table');
			orm.delete(orm.schema.countries, { name: 'Scottish Federation' }, callback);
		},
		function (res, callback) {
			callback(null);
		},
		function (callback) {
			orm.loadMany(orm.schema.countries, null, callback);
		},
		function (countries, callback) {
			orm.test('Countries');
			countries.forEach(function (country) {
				console.log(country.id + ': \t' + country.name);
			});
			console.log('');
			callback(null);
		},
		function (callback) {
			orm.loadMany(orm.schema.users, null, callback);
		},
		function (users, callback) {
			orm.test('Users (country)');
			users.forEach(function (user) {
				console.log(user.username + ' (' + user.country.name + ')');
			});
			console.log('');
			callback(null);
		},
		function (callback) {
			orm.test('Serialized fields (JSON)');
			orm.loadMany(orm.schema.posts, null, callback);
		},
		function (posts, callback) {
			orm.test('Posts');
			posts.forEach(function (post) {
				console.log('"' + post.title + '" by ' + post.user.username + ':');
				if (typeof post.content === 'string') {
					return callback(new Error('JSON has not been deserialized'));
				}
				console.log(post.content);
				console.log('');
			});
			orm.test('Adding "seo" field to all posts and saving');
			posts.forEach(function (post) { post.content.seo = 'SEO stuff'; });
			orm.saveMany(orm.schema.posts, posts, callback);
		},
		function (callback) {
			orm.loadMany(orm.schema.posts, null, callback);
		},
		function (posts, callback) {
			orm.test('Posts');
			posts.forEach(function (post) {
				console.log('"' + post.title + '" by ' + post.user.username + ':');
				console.log(post.content);
				console.log('');
			});
			callback(null);
		}
		],
		callback);
};
