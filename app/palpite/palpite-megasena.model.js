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
                     .map(s => { return parseInt(s) })
                     .sort()
    },
  }
},{
  paranoid: true,
  underscored: true,
  deletedAt: 'palpitado_em',
})

if (process.env.NODE_ENV != 'production') {
  //Inserindo Valores do Modelo PalpiteMegasena
  ds.mysql.sync({force: true}).then(() => {
    const FAKE_PALPITES_MEGASENA = `18,23,25,44,53,56
                                    25,29,36,39,42,47
                                    16,24,25,28,38,55
                                    21,22,32,47,48,55
                                    15,16,27,28,39,55
                                    18,23,25,42,56,57
                                    25,29,36,37,45,55
                                    16,24,25,27,55,59
                                    21,22,32,44,57,59
                                    15,16,26,53,55,59
                                    18,23,25,41,46,54
                                    15,16,24,28,34,47
                                    18,22,40,43,49,53
                                    25,29,30,40,43,57
                                    16,23,33,41,52,60
                                    21,22,28,36,38,60
                                    15,16,24,27,48,60
                                    18,22,40,41,52,55
                                    25,29,30,39,42,50
                                    16,23,33,40,47,48
                                    21,22,28,35,42,54
                                    15,16,24,27,35,58
                                    18,22,39,51,55,59
                                    25,29,30,38,39,60
                                    16,23,33,39,43,58
                                    21,22,28,34,48,56
                                    15,16,24,27,28,42`
    // palpites = FAKE_PALPITES_MEGASENA
    //   .split('\n')
    //   .map(l => { return l.split(',') })
    //   .map(as => { 
    //     return as.map(s => { return parseInt(s) })
    //              .sort()
    //   })
    //   .map(an => { return { numeros: an } })
    palpites = FAKE_PALPITES_MEGASENA
      .split('\n')
      .map(an => { return { numeros: an.trim()} })
    
    PalpiteMegasena.bulkCreate(palpites);
  });
}


//Exportando modelo PalpiteMegasena;
module.exports = PalpiteMegasena;