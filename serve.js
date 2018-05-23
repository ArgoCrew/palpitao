const HTTPServer = require('express')
const compression = require('compression');
const ErrorHandler = require('errorhandler')
const BodyParser = require('body-parser');

const palpite = require('./app/palpite/palpite.module')

const app = HTTPServer()
app.use(compression());
app.use(HTTPServer.static('./public'));
app.use(BodyParser.urlencoded({extend: true}));
app.use(ErrorHandler())

// -- LISTANDO PALPITES 
var id_number= 01;
app.get('/api/v1/palpites/megasena', (req, res) => {
  palpites = palpite.modelo.PalpiteMegasena
    .findAll({
      where: {
        palpitado_em: null,
        id: id_number,
      }
    })
    .then(palpitesMegasena => {
      res.json(palpitesMegasena)
    })
    .catch(err => {
      throw err
    })
    if (id_number < 250000) {
      id_number++;
    }
});



  



app.delete('/api/v1/palpites/megasena/:id', (req, res) => {
  console.info(req.query)
  let _id = [];
  try {
    _id = req.query.id.split(',').map(parseInt)
  } catch (e) {
    return res.status(400).json({
      message: `por favor verifique o paramentro id. ex: ?id1 ou ?id=1,2,3. Valor informado: ${req.params.id}`,
      err
    });
  }

  const filtros = {
    id: _id,
  }
  palpite.modelo.PalpiteMegasena.destroy({
    where: filtros
  }).then((numberInstances) => {
    return res.status(204).send()
  }).catch(err => {
    // TODO: Enviar para o ErroHandler
    return res.status(500).json(err)
  })
});

const SERVICE_PREFIX = process.env.SERVICE_PREFIX;

const PORT = process.env.PORT || process.env[`${SERVICE_PREFIX}_PORT`] || 8080,
      HOST   = process.env.HOST   || process.env[`${SERVICE_PREFIX}_HOST`] || '0.0.0.0';

app.listen(PORT, HOST, function() {
  console.log(`Example app listening on port ${PORT}!`);
})