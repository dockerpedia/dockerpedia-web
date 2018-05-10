angular.module('dockerpedia.controllers')
.controller('visCtrl', ['$scope', '$http', function(scope, http) {

  scope.title = 'Viz viz';
  scope.selected = null;
  scope.users = ["cfcommunity","google","mbabineau","jtarchie","pivotalcf","prom",
    "gliderlabs","v2tec","kope","zzrot","datadog","portainer","newrelic","openshift",
    "weaveworks","amazon","atmoz","pivotaldata","sysdig","pivotalservices","behance",
    "yelp","frodenas","ljfranklin","iron","centurylink","pcfseceng","cloudfoundry",
    "thefactory","gliderlabs"];

  scope.data = {};
  scope.upd = null;
  scope.upd2 = null;

  scope.getData = function () {
    var selected = scope.selected;
    if (selected && !scope.data[selected]) {
      http.post('/api/getJsonData', {user: selected }).then(
        function onSuccess (response) {
          scope.data[selected] = response.data;
          //console.log(response.data);
          scope.upd();
        },
        function onError (response) { console.log('Error: ' + response.data); }
      );
    }
  };

}]);
