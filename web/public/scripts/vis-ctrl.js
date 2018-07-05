angular.module('dockerpedia.controllers').controller('scatterCtrl', scatterCtrl);

scatterCtrl.$inject = ['$http'];

function scatterCtrl (http) {
  var vm = this;
  vm.selected = null;
  vm.searchTerm = 'weaveworks';
  vm.noResults = false;
  vm.data = {};
  vm.upd = null;
  vm.com = null;
  vm.search = search;

  function search () {
    //post
    http.post('https://api.mosorio.me/api/v1/viz', {user: vm.searchTerm}).then(
      function onSuccess (response) {
        if (response.data.count == 0)
          vm.noResults = true;
        else {
          vm.noResults = false;
          vm.upd(response.data.result);
        }
      },
      function onError (response) { console.log('Error: ' + response.data); }
    );
  };

  function search2 () {
    var selected = vm.searchTerm;
    vm.selected = selected;
    if (selected && !vm.data[selected]) {
      http.post('/api/getJsonData', {user: selected }).then(
        function onSuccess (response) {
          vm.data[selected] = response.data;
          console.log(response.data);
          vm.upd();
        },
        function onError (response) { console.log('Error: ' + response.data); }
      );
    } else if (selected) {
      vm.upd();
    }
  };

	$('#search-input').keypress(function(event){
		var keycode = (event.keyCode ? event.keyCode : event.which);
		if(keycode == '13'){
			search();
		}
	});

  search();
}
