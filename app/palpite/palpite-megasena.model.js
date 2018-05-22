const ds = require('../datasource');
// Estrutura Modelo PalpiteMegasena
const PalpiteMegasena = ds.mysql.define('megasena', {
  numeros: {
    type: ds.orm.STRING,
    allowNull: false,
    unique: true,
    get() {
      _numeros = this.getDataValue('numeros')
       return _numeros.split(',')
                     // .map(s => { return parseInt(s) })
                     // .sort()
    },
  }
},{
  paranoid: true,
  underscored: true,
  deletedAt: 'palpitado_em',
})




//Exportando modelo PalpiteMegasena;
module.exports = PalpiteMegasena;