angular.module('dockerpedia.controllers').controller('treemapCtrl', treemapCtrl);

treemapCtrl.$inject = ['$http', '$timeout']

function treemapCtrl (http, $timeout) {
  var vm = this;
  vm.searchTerm = '';
  vm.data = null;
  vm.upd = null;
  vm.test = null;
  vm.search = search;
  vm.encode = {size: true, popularity: true, vulnerabilities: true};
  vm.encodeToggle = encodeToggle;
  vm.noResults = false;
  vm.tutorial = tutorial;

  function tutorial () {
    var intro = introJs();
    intro.setOptions({
      steps: [
        { intro: "This visualization will guide you to select the best image available of some package." },
        { element: '#step1', intro: "You can search some package writing its name here." },
        { element: '#step1', intro: "As example we can search <strong> ruby </strong>." },
        { element: '#chart', intro: "The results of your search are displayed here.", position: 'top'},
        { element: '#legend', intro: "The colors encode the vulnerabilities of the packages." },
        { element: '#dropdownMenuButton', intro: "You can change the area codification here." },
      ]
    });
    intro.start().onbeforechange(function () {
      switch (intro._currentStep) {
        case 2:
          writeRuby();
        break;
      }
    });
  }

  function writeRuby () {
    $timeout(s=>{vm.searchTerm = 'r'}, 300);
    $timeout(s=>{vm.searchTerm += 'u'}, 600);
    $timeout(s=>{vm.searchTerm += 'b'}, 900);
    $timeout(s=>{vm.searchTerm += 'y'; vm.search()}, 1200);
  }

  function encodeToggle (key) {
    if (vm.encode[key] == false) vm.encode[key] = true;
    else {
      var i = 0;
      for (var k in vm.encode) if (vm.encode[k]) i +=1;
      if (i >= 2) vm.encode[key] = false;
    }
    if (vm.test) vm.test();
  }

  function search () {
    //images per repo
    http.post('https://api.dockerpedia.inf.utfsm.cl/api/v1/viz2', {package: vm.searchTerm, images: 10}).then(
      function onSuccess (response) {
        if (response.data.result.children.length == 0)
          vm.noResults = true;
        else {
          vm.noResults = false;
          vm.data = response.data.result;
          vm.upd(vm.data);
        }
      },
      function onError (response) { console.log('Error: ' + response.data.result); }
    );
  };

	$('#search-input').keypress(function(event){
		var keycode = (event.keyCode ? event.keyCode : event.which);
		if(keycode == '13'){
			search();
		}
	});

};
