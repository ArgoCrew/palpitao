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
app.get('/api/v1/palpites/megasena', (req, res) => {
  const RANDON_ID = Math.floor(Math.random()*(27-1+1)+1);
  palpites = palpite.modelo.PalpiteMegasena
    .findAll({
      where: {
        palpitado_em: null,
        id: RANDON_ID,
      }
    })
    .then(palpitesMegasena => {
      res.json(palpitesMegasena)
    })
    .catch(err => {
      throw err
    })
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

const settings = {
  app: {
    port: process.env.PORT || 3000
  }
}
app.listen(settings.app.port, () => console.log('Example app listening on port 3000!'))