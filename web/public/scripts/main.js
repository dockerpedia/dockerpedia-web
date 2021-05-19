angular.module('dockerpedia.controllers', ['angular-loading-bar', 'ngAnimate'])

.controller('mainCtrl', ['$scope', '$location', '$window', function(scope, location, window) {
  scope.examples = [ 
`PREFIX dpv: <http://dockerpedia.inf.utfsm.cl/vocab#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?image ?label WHERE { 
  ?image a dpv:SoftwareImage ;
  		 rdfs:label ?label;
} limit 100`,
`PREFIX dpv: <http://dockerpedia.inf.utfsm.cl/vocab#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?image ?software WHERE { 
  ?image a dpv:SoftwareImage ;
  		 dpv:containsSoftware ?software
} limit 100
`,
`PREFIX dpv: <http://dockerpedia.inf.utfsm.cl/vocab#>
PREFIX DPimage: <http://dockerpedia.inf.utfsm.cl/resource/SoftwareImage/>
 
SELECT ?p WHERE { 
	DPimage:dockerpedia-pegasus_workflow_images_latest dpv:containsSoftware ?p .
   MINUS{
    DPimage:dockerpedia-pegasus_workflow_images-4.8.5 dpv:containsSoftware ?p   
 	}
} limit 100`,
`PREFIX dpv: <http://dockerpedia.inf.utfsm.cl/vocab#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?packagename (count(?packagename) as ?count) WHERE {
  ?image a dpv:SoftwareImage ;
  		 dpv:containsSoftware ?software .
  ?package dpv:hasVersion ?packageversion .
  ?package rdfs:label ?packagename .
} group by (?packagename) order by desc(?count) limit 10`,
`PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
prefix dpv: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT ?packagename (count(?packagename) as ?count) WHERE {
  ?image dpv:hasLayer ?layer .
  ?modification dpv:modifiedLayer ?layer .
  ?modification dpv:relatedPackage ?packageversion .
  ?package dpv:hasVersion ?packageversion .
  ?package rdfs:label ?packagename .
} group by (?packagename) order by desc(?count) limit 10`,
`PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dpv: <http://dockerpedia.inf.utfsm.cl/vocab#>

SELECT ?layer (count(?layer) as ?count) WHERE {
  ?image a dpv:SoftwareImage ;
         dpv:composedBy ?layer .
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
  		?package a dpv:SoftwarePackage ;
             rdfs:label "dash" ;
             dpv:hasVersion ?package_version;
			 dpv:isPackageOf ?os .
        ?package_version dpv:isInstalledOn ?image
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
