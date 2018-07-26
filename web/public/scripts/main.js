angular.module('dockerpedia.controllers', ['angular-loading-bar', 'ngAnimate'])

.controller('mainCtrl', ['$scope', '$location', '$window', function(scope, location, window) {
  scope.examples = [ 
`PREFIX vocab: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT ?repo ?image WHERE { 
  ?repo  a vocab:Repository ;
         vocab:hasImage ?image.
  ?image a vocab:SoftwareImage .
} limit 10`,
`PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vocab: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT ?packagename ?packageversionint WHERE {
  ?image vocab:id 1140801 .
  ?image vocab:hasLayer ?layer .
  ?modification vocab:modifiedLayer ?layer .
  ?modification vocab:relatedPackage ?packageversion .
  ?package vocab:hasVersion ?packageversion .
  ?package rdfs:label ?packagename .
  ?packageversion rdfs:label ?packageversionint
} limit 500`,
`PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vocab: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT ?packagename ?packageversionnumber ?vulnerabilityname ?severity WHERE {
  ?image vocab:id 1140801 .
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
`PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vocab: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT ?osname (count(?osname) as ?count) WHERE { 
  { SELECT distinct ?image ?os WHERE {
      ?image a vocab:SoftwareImage .
      ?image vocab:hasLayer ?layer .
      ?layer vocab:useOS ?os .
    }
  } 
  ?os rdfs:label ?osname 
} group by (?osname) order by desc(?count) limit 10`,
`PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix vocab: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT ?packagename (count(?packagename) as ?count) WHERE {
  ?image vocab:hasLayer ?layer .
  ?modification vocab:modifiedLayer ?layer .
  ?modification vocab:relatedPackage ?packageversion .
  ?package vocab:hasVersion ?packageversion .
  ?package rdfs:label ?packagename .
} group by (?packagename) order by desc(?count) limit 10`,
`PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vocab: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT ?layer (count(?layer) as ?count) WHERE {
  ?image a vocab:SoftwareImage ;
         vocab:hasLayer ?layer .
} group by (?layer) order by desc(?count) limit 10`,
`PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX vocab: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT ?packagename (count(?packagename) as ?count) WHERE {
  ?vulnerability vocab:severity "Critical" .
  ?packageversion vocab:hasVulnerability ?vulnerability.
  ?package vocab:hasVersion ?packageversion ;
           rdfs:label ?packagename .
} group by (?packagename) order by desc(?count) limit 20`,
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
    YASQE.defaults.readOnly = true;
    YASQE.defaults.viewportMargin = Infinity;
    YASQE.defaults.createShareLink = null;
    YASQE.defaults.sparql.showQueryButton = true;
    YASQE.defaults.sparql.endpoint = "https://dockerpedia.inf.utfsm.cl/dockerpedia/sparql";
    for (var n in scope.examples) {
      yasqeTMP = YASQE(document.getElementById("yasqe"+n), {});
      yasqeTMP.setValue(scope.examples[n]);
      yasqeTMP.query = function (s) {
        q ='https://dockerpedia.inf.utfsm.cl/query?' + $.param(YASQE.createShareLink(this));
        window.open(q, '_blank');
      };
      scope.yasqe.push(yasqeTMP);
    }
  }
}]);
