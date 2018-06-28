angular.module('dockerpedia.controllers').controller('treemapCtrl', treemapCtrl);

treemapCtrl.$inject = ['$http']


function treemapCtrl (http) {
  var vm = this;
  vm.searchTerm = '';
  vm.data = null;
  vm.upd = null;
  vm.test = null;
  vm.search = search;
  vm.encode = {size: true, popularity: true, vulnerabilities: true};
  vm.encodeToggle = encodeToggle;

  function encodeToggle (key) {
    if (vm.encode[key] == false) vm.encode[key] = true;
    else {
      var i = 0;
      for (var k in vm.encode) if (vm.encode[k]) i +=1;
      if (i>=2) vm.encode[key] = false;
    }
    vm.test();
  }

  function search () {
    console.log('searching: ' + vm.searchTerm);
    //return test();
    http.get('https://api.mosorio.me/api/v1/viz?query='+vm.searchTerm).then(
      function onSuccess (response) {
        vm.data = response.data;
        vm.upd(vm.data);
      },
      function onError (response) { console.log('Error: ' + response.data); }
    );
  };

	$('#search-input').keypress(function(event){
		var keycode = (event.keyCode ? event.keyCode : event.which);
		if(keycode == '13'){
			search();
		}
	});

};
