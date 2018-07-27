angular.module('dockerpedia.controllers').controller('describeCtrl', describeCtrl);

describeCtrl.$inject = ['$scope', '$location', '$http']

function describeCtrl (scope, location, http) {
  var endpoint = "https://dockerpedia.inf.utfsm.cl/dockerpedia/sparql";
  var vm = this;
  vm.toPrefix = toPrefix;
  vm.getValues = getValues;
  vm.properties = [];
  vm.values = {};
  var prefixes = [
    {prefix: 'rdf:',   uri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#"},
    {prefix: 'rdfs:',  uri: "http://www.w3.org/2000/01/rdf-schema#"},
    {prefix: 'owl:',   uri: "http://www.w3.org/2002/07/owl#"},
    {prefix: 'DPvoc:', uri: "http://dockerpedia.inf.utfsm.cl/vocab#"},
    {prefix: 'DPres:', uri: "http://dockerpedia.inf.utfsm.cl/resource/"},
  ];

  vm.absUrl = location.absUrl();
  vm.uri = vm.absUrl.replace('#!#','#').replace("https","http").replace("localhost:7070","dockerpedia.inf.utfsm.cl");

  execQuery(propertiesQuery(vm.uri), data => {
    vm.properties = data.results.bindings;
  });

  function getValues (prop, i) {
    if (i > 0) prop.step += 1;
    if (i < 0) prop.step -= 1;
    execQuery(valuesQuery(vm.uri, prop.uri.value, prop.step), data => {
      vm.values[prop.uri.value] = data.results.bindings;
    });
  }

  function toPrefix (uri) {
    //transform this uri to prefix notation.
    for (var i in prefixes) {
      if (uri.includes(prefixes[i].uri)) {
        return uri.replace(prefixes[i].uri, prefixes[i].prefix);
      }
    }
    return uri;
  }

  /* query helpers */
  function propertiesQuery (uri) {
    q = 'SELECT DISTINCT ?uri ?label WHERE {\n';
    q+= '  <' + uri + '> ?uri [] .\n';
    q+= '  OPTIONAL {?uri <http://www.w3.org/2000/01/rdf-schema#label> ?label .} \n'
    q+= '}';
    return q;
  }

  /* query helpers */
  function valuesQuery (uri, prop, step) { //TODO: limit, offset and pagination.
    q = 'SELECT DISTINCT ?uri ?label WHERE {\n';
    q+= '  <' + uri + '> <' + prop + '> ?uri .\n';
    q+= '  OPTIONAL {?uri <http://www.w3.org/2000/01/rdf-schema#label> ?label .} \n'
    q+= '} limit 11 offset ' + (step)*10;
    return q;
  }

  /* send query to the endpoint */
  function toForm (obj) {
    var str = [];
    for(var p in obj)
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    return str.join("&");
  }

  function execQuery (query, callback) {
    http({
        method: 'post',
        url: endpoint,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        transformRequest: toForm, 
        data: { query: query, format: "application/sparql-results+json" }
    }).then(
      function onSuccess (response) { callback(response.data); },
      function onError   (response) { console.log('Error: ', response); }
    );
  }
}
