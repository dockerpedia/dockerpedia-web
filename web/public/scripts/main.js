angular.module('dockerpedia', [])

.controller('mainCtrl', ['$scope', '$location', function(scope, location) {
  scope.examples = [ 
`PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vocab: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT ?packagename ?packageversionint
WHERE {
  ?image vocab:id 62434 .
  ?image vocab:hasLayer ?layer .
  ?modification vocab:modifiedLayer ?layer .
  ?modification vocab:relatedPackage ?packageversion .
  ?package vocab:hasVersion ?packageversion .
  ?package rdfs:label ?packagename .
  ?packageversion rdfs:label ?packageversionint
} limit 500`,
`PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vocab: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT ?packagename ?packageversionnumber ?vulnerabilityname ?severity

WHERE {
  ?image vocab:id 62434 .
  ?image vocab:hasLayer ?layer .
  ?modification vocab:modifiedLayer ?layer .
  ?modification vocab:relatedPackage ?packageversion .
  ?package vocab:hasVersion ?packageversion .
  ?package rdfs:label ?packagename .
  ?packageversion rdfs:label ?packageversionnumber .
  ?packageversion vocab:hasVulnerability ?vulnerability.
  ?vulnerability rdfs:label ?vulnerabilityname .
  ?vulnerability vocab:severity ?severity
} limit 10000`,
`#Ranking operating system 
#shows a ranking of the most commonly used operating systems
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vocab: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT ?osname (count(?osname) as ?count) WHERE { 
  { SELECT distinct ?image ?os WHERE {
      ?image rdf:type vocab:Image .
      ?image vocab:hasLayer ?layer .
      ?layer vocab:useOS ?os .
    }
  } 
  ?os rdfs:label ?osname 
} group by (?osname) order by desc(?count) limit 10`,
`#Ranking packages
#shows a ranking of the most commonly used packages
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix vocab: <http://dockerpedia.inf.utfsm.cl/vocab#>


SELECT ?packagename (count(?packagename) as ?count)
WHERE {
  ?image vocab:hasLayer ?layer .
  ?modification vocab:modifiedLayer ?layer .
  ?modification vocab:relatedPackage ?packageversion .
  ?package vocab:hasVersion ?packageversion .
  ?package rdfs:label ?packagename .
} group by (?packagename) order by desc(?count) limit 10`,
`#shows the number of versions that have critical vulnerabilities for package.
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vocab: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT distinct ?packagename ?packageversionnumber ?vulnerabilitylabel
WHERE {
  ?vulnerability vocab:severity "Critical" ;
                 rdfs:label ?vulnerabilitylabel .
  ?packageversion vocab:hasVulnerability ?vulnerability;
                  rdfs:label ?packageversionnumber .
  ?package vocab:hasVersion ?packageversion ;
           rdfs:label ?packagename .
  
} limit 100`,
`#A ImageLayer can be used for multiples Image
#What is the most commonly used layer?
PREFIX rdf:   <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vocab: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT ?layer (count(?layer) as ?count)
WHERE {
  ?image rdf:type vocab:Image ;
         vocab:hasLayer ?layer .
} group by (?layer) order by desc(?count) limit 10`
  ];

  var absUrlArray = location.absUrl().split('/');
  scope.loc = absUrlArray[absUrlArray.length -1].split('?')[0].split('#')[0];
  if (scope.loc == 'query') {
    //console.log(YASGUI.defaults);
    scope.yasgui = YASGUI(document.getElementById("yasgui"), {
      yasqe: { sparql:{ endpoint:'https://dockerpedia.inf.utfsm.cl/dockerpedia/sparql' } },
      endpoint: 'https://dockerpedia.inf.utfsm.cl/dockerpedia/sparql',
      catalogueEndpoints: [],
    });
  } else if (scope.loc == 'examples') {
    var yasqeTMP;
    scope.yasqe = [];
    YASQE.defaults.sparql.showQueryButton = false;
    YASQE.defaults.readOnly = true;
    YASQE.defaults.viewportMargin = Infinity;
    YASQE.defaults.createShareLink = null;
    for (var n in scope.examples) {
      yasqeTMP = YASQE(document.getElementById("yasqe"+n), {});
      yasqeTMP.setValue(scope.examples[n]);
      scope.yasqe.push(yasqeTMP);
    }
  }
}])

.controller('describeCtrl', ['$scope', '$location', '$http', function(scope, location, http) {
  scope.absUrl   = location.absUrl()//.replace("localhost:7070","dockerpedia.inf.utfsm.cl");
  scope.objProp  = {};
  scope.dataProp = {};
  scope.labels   = {}; //this is label to iri
  scope.iri      = null;
  scope.type     = null;

  http.post('/api/describe', {iri: scope.absUrl }).then(
    function onSuccess (response) {
      if (response.data) {
        scope.iri  = response.data['@id'];
        scope.type = response.data['@type'];
        delete response.data['@id'];
        delete response.data['@type'];
        for (var key in response.data) {
          if (key[0] != '@') {
            if (response.data[key].substring(0, 4) == 'http')
              scope.objProp[key] = response.data[key];
            else
              scope.dataProp[key] = response.data[key];
            delete response.data[key];
          }
        }
        for (var key in response.data['@context']) {
          scope.labels[key] = response.data['@context'][key]['@id'];
          //TODO: ['@type'] has no type currently.
        }
        delete response.data['@context'];
        //console.log(response.data); not saved data
      } else {
        console.log('/api/describe <'+scope.absUrl+'> returns nothing!')
      }
    },
    function onError (response) { console.log('Error: ' + response.data); }
  );
}]);
