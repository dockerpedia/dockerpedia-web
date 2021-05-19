angular.module('dockerpedia.controllers', ['angular-loading-bar', 'ngAnimate'])

.controller('mainCtrl', ['$scope', '$location', '$window', function(scope, location, window) {
  scope.examples = [ 
`PREFIX dpv: <http://dockerpedia.inf.utfsm.cl/vocab#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?image ?label WHERE { 
  ?image a vocab:SoftwareImage ;
  		 rdfs:label ?label;
} limit 100`,
`PREFIX dpv: <http://dockerpedia.inf.utfsm.cl/vocab#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?image ?software WHERE { 
  ?image a vocab:SoftwareImage ;
  		 vocab:containsSoftware ?software
} limit 100
`,
`PREFIX dpv: <http://dockerpedia.inf.utfsm.cl/vocab#>
PREFIX DPimage: <http://dockerpedia.inf.utfsm.cl/resource/SoftwareImage/>
 
SELECT ?p WHERE { 
	DPimage:dockerpedia-pegasus_workflow_images_latest vocab:containsSoftware ?p .
   MINUS{
    DPimage:dockerpedia-pegasus_workflow_images-4.8.5 vocab:containsSoftware ?p   
 	}
} limit 100`,
`PREFIX dpv: <http://dockerpedia.inf.utfsm.cl/vocab#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?packagename (count(?packagename) as ?count) WHERE {
  ?image a vocab:SoftwareImage ;
  		 vocab:containsSoftware ?software .
  ?package vocab:hasVersion ?packageversion .
  ?package rdfs:label ?packagename .
} group by (?packagename) order by desc(?count) limit 10`,
`PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix dpv: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT ?packagename (count(?packagename) as ?count) WHERE {
  ?image vocab:hasLayer ?layer .
  ?modification vocab:modifiedLayer ?layer .
  ?modification vocab:relatedPackage ?packageversion .
  ?package vocab:hasVersion ?packageversion .
  ?package rdfs:label ?packagename .
} group by (?packagename) order by desc(?count) limit 10`,
`PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dpv: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT ?layer (count(?layer) as ?count) WHERE {
  ?image a vocab:SoftwareImage ;
         vocab:composedBy ?layer .
} group by (?layer) order by desc(?count) limit 10`,
`PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dockerpedia: <http://dockerpedia.inf.utfsm.cl/resource/>
PREFIX http: <http://www.w3.org/2011/http#>
PREFIX dpv: <http://dockerpedia.inf.utfsm.cl/vocab#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX docker: <https://www.w3.org/ns/bde/docker#>
PREFIX DPimage: <http://dockerpedia.inf.utfsm.cl/resource/SoftwareImage/>
PREFIX DPpackage: <http://dockerpedia.inf.utfsm.cl/resource/SoftwarePackage/>

SELECT ?image ?package_version ?os
	WHERE {
  		?package a vocab:SoftwarePackage ;
             rdfs:label "dash" ;
             vocab:hasVersion ?package_version;
			 vocab:isPackageOf ?os .
        ?package_version vocab:isInstalledOn ?image
}`,
  ];

  var absUrlArray = location.absUrl().split('/');
  scope.loc = absUrlArray[absUrlArray.length -1].split('?')[0].split('#')[0];
  if (scope.loc == 'query') {
    //console.log(YASGUI.defaults);
    scope.yasgui = YASGUI(document.getElementById("yasgui"), {
      yasqe: { sparql:{ endpoint:'https://dockerpedia.inf.utfsm.cl/v3/sparql' } },
      endpoint: 'https://dockerpedia.inf.utfsm.cl/v3/sparql',
      catalogueEndpoints: [],
    });
  } else if (scope.loc == 'examples') {
    var yasqeTMP;
    scope.yasqe = [];
    YASQE.defaults.readOnly = true;
    YASQE.defaults.viewportMargin = Infinity;
    YASQE.defaults.createShareLink = null;
    YASQE.defaults.sparql.showQueryButton = true;
    YASQE.defaults.sparql.endpoint = "https://dockerpedia.inf.utfsm.cl/v3/sparql";
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
