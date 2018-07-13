angular.module('dockerpedia.controllers').controller('scatterCtrl', scatterCtrl);

scatterCtrl.$inject = ['$http'];

function scatterCtrl (http) {
  var vm = this;
  vm.searchTerm = 'weaveworks';
  vm.noResults = false;
  vm.upd = null;
  vm.com = null;
  vm.search = search;
  vm.getPackages = getPackages;

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

  function getPackages (id) {
    http.get('https://api.mosorio.me/api/v1/images/'+id+'/packages').then(
      function onSuccess (response) {
        vm.com(response.data);
      },
      function onError (response) { console.log('Error: ' + response.data); }
    );
  }

	$('#search-input').keypress(function(event){
		var keycode = (event.keyCode ? event.keyCode : event.which);
		if(keycode == '13'){
			search();
		}
	});

  search();
}
