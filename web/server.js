 // SET UP ====================================================================
const express     = require('express');
const morgan      = require('morgan');
const bodyParser  = require('body-parser');
const request     = require('request');

const port      = 7070;
const sparqlUrl = "https://dockerpedia.inf.utfsm.cl/dockerpedia/sparql";
const resFormat = "application/ld+json";
const views     = __dirname + '/public/views/';

var app = express();
// EXPRESS CONFIGURATION ======================================================
app.set('view engine', 'pug');
app.use(express.static(__dirname + '/public')); 
app.use(morgan('dev'));
app.locals.pretty = true; //TODO check in all brow
app.use(bodyParser.urlencoded({'extended':'true'}));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));

// POST =======================================================================
app.post('/api/describe', function(req, res) {
  var q = 'DESCRIBE <' + req.body.iri + '>';
  console.log(q);
  request.post(
    sparqlUrl, 
    { form: {format: resFormat, query: q} },
    function (err, rcode, body) {
      res.json(JSON.parse(body));
  });
});

// ROUTES =====================================================================
app.get('/query',      function(req, res) {res.render(views+'query.pug'   );});
app.get('/examples',   function(req, res) {res.render(views+'examples.pug');});
app.get('/vocab*',     function(req, res) {res.render(views+'describe.pug');});
app.get('/resource/*', function(req, res) {res.render(views+'describe.pug');});
app.get('/*',          function(req, res) {res.render(views+'index.pug'   );});


// LISTEN =====================================================================
app.listen(port);
console.log("App listening on port", port);
