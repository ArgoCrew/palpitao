const Sequelize = require('sequelize');


const mysql = new Sequelize('node-palpitao', 'root', '3n$01Enzo', {
  host: 'localhost',
  dialect: 'mysql',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
})

module.exports.orm = Sequelize;
module.exports.mysql = mysql;