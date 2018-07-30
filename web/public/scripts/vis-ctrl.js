angular.module('dockerpedia.controllers').controller('scatterCtrl', scatterCtrl);

scatterCtrl.$inject = ['$http', 'd3v3'];

function scatterCtrl (http, d3) {
  var vm = this;
  vm.searchTerm = 'weaveworks';
  vm.noResults = false;
  vm.update = null;
  vm.start = null;
  vm.com = null;
  vm.search = search;
  vm.setConf = setConf;
  vm.rmCat = removeCategory;
  vm.rmShape = removeShape;
  vm.getPackages = getPackages;
  vm.scatter = {
    data: [],
    raw: [],
    // settings
    xLabel: 'Date',
    yLabel: '',
    getX: d => { return d.date; },
    getY: null,
    getR: null,
    getC: null,
    getS: null,
    // from svg
    categories: [],
    refresh: null,
  };

  vm.conf = {
    yAxis: 'Vulnerabilities', radius: 'None', category: 'Repository', shape: 'User',
    yAxisOpts: {
      'Vulnerabilities': { getY: d => {return d.vuln},      yLabel: 'Vulnerabilities' },
      'Packages':        { getY: d => {return d.packages},  yLabel: 'Packages' },
      'Size':            { getY: d => {return d.full_size}, yLabel: 'Size' },
    },
    radiusOpts: {
      'None':     { getR: d => {return 100} },
      'Packages': { getR: d => {return d.packages} },
      'Size':     { getR: d => {return d.full_size} },
    },
    categoryOpts: {
      'Repository': { getC: d => {return d.parent.name} },
      'User':       { getC: d => {return d.parent.namespace} },
    },
    shapeOpts: {
      'User':       { getS: d => {return d.parent.namespace} },
      'Repository': { getS: d => {return d.parent.name} },
    }
  };
  setConf();
  function setConf () {
    vm.scatter.getY = vm.conf.yAxisOpts[vm.conf.yAxis].getY;
    vm.scatter.yLabel = vm.conf.yAxisOpts[vm.conf.yAxis].yLabel;
    vm.scatter.getR = vm.conf.radiusOpts[vm.conf.radius].getR;
    vm.scatter.getC = vm.conf.categoryOpts[vm.conf.category].getC;
    vm.scatter.getS = vm.conf.shapeOpts[vm.conf.shape].getS;
    if (vm.scatter.refresh) vm.scatter.refresh();
  }

  function updateData () {
    vm.scatter.data = [];
    vm.scatter.labels = [];
    vm.scatter.raw.filter(obj => {return obj.active}).forEach(repo => {
      vm.scatter.labels.push( repo.name );
      repo.children.forEach(image => {
        vm.scatter.data.push(image);
      });
    });
    //console.log(vm.scatter)
  }

  function removeCategory (name) {
    vm.scatter.data = vm.scatter.data.filter(obj => {
      return (vm.scatter.getC(obj) != name);
    });
  }

  function removeShape (name) {
    vm.scatter.data = vm.scatter.data.filter(obj => {
      return (vm.scatter.getS(obj) != name);
    });
  }

  var parseDate = d3.time.format("%Y-%m-%d").parse;
  function search () {
    //post
    http.post('https://api.mosorio.me/api/v1/viz', {user: vm.searchTerm}).then(
      function onSuccess (response) {
        if (response.data.count == 0)
          vm.noResults = true;
        else {
          vm.noResults = false;
          //vm.update(response.data.result)
          var first = (vm.scatter.raw.length == 0);
          var filtered = response.data.result.children.filter(obj => { return (obj.children); });
          var split_date;

          filtered.forEach(repo => {
            repo.active = true;
            repo.children = repo.children.filter(obj => { return (obj.last_updated); });
            repo.children.forEach( image => {
              split_date = image.last_updated.split('T');
              image.parent = repo;
              image.date = parseDate( split_date[0] );
              image.vuln = image.vulnerabilities_critical +
                           image.vulnerabilities_defcon1 +
                           image.vulnerabilities_high +
                           image.vulnerabilities_low +
                           image.vulnerabilities_medium +
                           image.vulnerabilities_negligible +
                           image.vulnerabilities_unknown;
            });
            vm.scatter.raw.push(repo);
          });
          updateData();
          //vm.start();
          if (first) vm.start();
          else vm.scatter.refresh();
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
