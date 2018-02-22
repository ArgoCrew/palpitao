const Sequelize = require('sequelize');

const MYSQL_URI = process.env.MYSQL_URI || process.env.JAWSDB_URL || 'mysql://root:P@ssw0rd@localhost:3306/papitao-node';

const mysql = new Sequelize(MYSQL_URI, {
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
})

module.exports.orm = Sequelize;
module.exports.mysql = mysql;