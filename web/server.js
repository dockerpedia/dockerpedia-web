 // SET UP =====================================================================
const express     = require('express');
const morgan      = require('morgan');       // Log requests to the console (e4)
const bodyParser  = require('body-parser');  // Pull info from HTML POST (e4)
//const endpoint    = require('./sparqlService');
//const query       = require('./drugbankQuery');

var app   = express();
var debug = 1;
const port = 7070;
// EXPRESS CONFIGURATION =======================================================
app.set('view engine', 'pug');
app.use(express.static(__dirname + '/public')); 
app.use(morgan('dev'));
app.locals.pretty = true; //TODO check in all brow
app.use(bodyParser.urlencoded({'extended':'true'}));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
// ENDPOINT CONFIGURATION ======================================================
//endpoint.setURL("http://localhost:3030/DrugBank/sparql");
//endpoint.setFormat("application/sparql-results+json");
//endpoint.server.debug = 1;

// ROUTES ======================================================================
var viewPath = __dirname + '/public/views/';
// Query
app.get('/query',    function(req, res) { res.render(viewPath + 'query.pug'); });
app.get('/examples',    function(req, res) { res.render(viewPath + 'examples.pug'); });

app.get('/*', function(req, res) { res.render(viewPath + 'index.pug'); });


// LISTEN ======================================================================
app.listen(port);
console.log("App listening on port", port);
