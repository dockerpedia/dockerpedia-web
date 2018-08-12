angular.module('dockerpedia.controllers').controller('scatterCtrl', scatterCtrl);

scatterCtrl.$inject = ['$http', 'd3v3'];

function scatterCtrl (http, d3) {
  var vm = this;
  vm.selected = null;
  vm.searchTerm = 'weaveworks';
  vm.noResults = false;
  vm.search = search;
  vm.com = null;
  vm.setConf = setConf;
  vm.rmCat = removeCategory;
  vm.rmShape = removeShape;
  vm.markCat = markCategory;
  vm.markShape = markShape;
  vm.getPackages = getPackages;
  vm.applyFilters = applyFilter;
  vm.categoryMarked = false;
  vm.shapeMarked = false;
  vm.show = { categories: false, shapes: false, filters: false, details: false };

  vm.details = {
    data: {Critical: [], High: [], Medium: [], Low: []},
    active: {Critical: false, High: false, Medium: false, Low: false},
  };

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
    yTick: null,
    toBytes: formatBytes,
    // from svg
    categories: [],
    shapes: [],
    refresh: null,
    start: null,
  };

  vm.filters = {
    text: '',
    size: { min: 0, max: 0, opts: {floor: 0, ceil: 0, onEnd: applyFilter, translate: formatBytes}},
    vuln: { min: 0, max: 0, opts: {floor: 0, ceil: 0, onEnd: applyFilter}},
    score: { min: 0, max: 0, opts: {floor: 0, ceil: 0, onEnd: applyFilter}},
    packages: { min: 0, max: 0, opts: {floor: 0, ceil: 0, onEnd: applyFilter}},
  }

  vm.conf = {
    yAxis: 'Score', size: 'None', category: 'Repository', shape: 'SO',
    yAxisOpts: {
      'Vulnerabilities': { getY: d => {return d.vuln},      yLabel: 'Vulnerabilities', yTick: d => {return d} },
      'Packages':        { getY: d => {return d.packages},  yLabel: 'Packages',        yTick: d => {return d} },
      'Score':           { getY: d => {return d.score},     yLabel: 'Score',           yTick: d => {return d} },
      'Size':            { getY: d => {return d.full_size}, yLabel: 'Size', yTick: d => {return formatBytes(d,0)} },
    },
    sizeOpts: {
      'None':     { getR: d => {return 100} },
      'Packages': { getR: d => {return 70 + (d.packages/vm.filters.packages.opts.ceil)*200} },
      'Size':     { getR: d => {return 70 + (d.full_size/vm.filters.size.opts.ceil)*200} },
    },
    categoryOpts: {
      'Risk':       { getC: d => {return d.risk} },
      'Repository': { getC: d => {return d.parent.name +' ('+ d.parent.namespace+')'} },
      'User':       { getC: d => {return d.parent.namespace} },
      'SO':         { getC: d => {
        if (sp = d.operating_system.split(':') ) {
          return sp[0];
        }
        return d.operating_system;
      } },
    },
    shapeOpts: {
      'Repository': { getS: d => {return d.parent.name} },
      'User':       { getS: d => {return d.parent.namespace} },
      'SO':         { getS: d => {
        if (sp = d.operating_system.split(':') ) {
          return sp[0];
        }
        return d.operating_system;
      } },
    }
  };

  var lastConf = {category: '', shape: ''};
  setConf();

  function setConf () {
    vm.scatter.getY = vm.conf.yAxisOpts[vm.conf.yAxis].getY;
    vm.scatter.yLabel = vm.conf.yAxisOpts[vm.conf.yAxis].yLabel;
    vm.scatter.yTick = vm.conf.yAxisOpts[vm.conf.yAxis].yTick;
    vm.scatter.getR = vm.conf.sizeOpts[vm.conf.size].getR;
    vm.scatter.getC = vm.conf.categoryOpts[vm.conf.category].getC;
    vm.scatter.getS = vm.conf.shapeOpts[vm.conf.shape].getS;
    if (lastConf.category != vm.conf.category) updateCategories();
    if (lastConf.shape != vm.conf.shape) updateShapes();
    if (vm.scatter.refresh) vm.scatter.refresh();
  }

  function updateShapes () {
    var sha = new Set();
    vm.scatter.data.forEach( image => {
      sha.add( vm.scatter.getS(image) );
    });
    var newSha = [], old;
    sha.forEach(name => {
      old = vm.scatter.shapes.filter(x => {return x.name == name});
      if (old.length == 1) newSha.push( old[0] );
      else newSha.push( {name:name, color:null, marked:false} );
    });
    vm.scatter.shapes = newSha;
    lastConf.shape = vm.conf.shape;
  }

  function updateCategories () {
    var cat = new Set();
    vm.scatter.data.forEach( image => {
      cat.add( vm.scatter.getC(image) );
    });
    var newCat = [], old;
    cat.forEach(name => {
      old = vm.scatter.categories.filter(x => {return x.name == name});
      if (old.length == 1) newCat.push( old[0] );
      else newCat.push( {name:name, color:null, marked:false} );
    });
    vm.scatter.categories = newCat;
    lastConf.category = vm.conf.category;
  }

  function updateData () {
    // Check filter status
    var b1 = (vm.filters.size.max == vm.filters.size.opts.ceil),
        b2 = (vm.filters.vuln.max == vm.filters.vuln.opts.ceil);
        b3 = (vm.filters.score.max == vm.filters.score.opts.ceil);
        b4 = (vm.filters.packages.max == vm.filters.packages.opts.ceil);

    // Categories and shapes
    lastConf.category = vm.conf.category;
    lastConf.shape = vm.conf.shape;
    var cat = new Set(), sha = new Set();

    // Data
    vm.scatter.data = [];
    vm.scatter.raw.filter(obj => {return obj.active}).forEach(repo => {
      repo.children.forEach(image => {
        cat.add( vm.scatter.getC(image) );
        sha.add( vm.scatter.getS(image) );
        if (vm.filters.size.opts.ceil < image.full_size)
          vm.filters.size.opts.ceil = image.full_size;
        if (vm.filters.vuln.opts.ceil < image.vuln)
          vm.filters.vuln.opts.ceil = image.vuln;
        if (vm.filters.score.opts.ceil < image.value)
          vm.filters.score.opts.ceil = image.value;
        if (vm.filters.packages.opts.ceil < image.packages)
          vm.filters.packages.opts.ceil = image.packages;
        vm.scatter.data.push(image);
      });
    });

    // Filters
    if (b1) vm.filters.size.max = vm.filters.size.opts.ceil;
    if (b2) vm.filters.vuln.max = vm.filters.vuln.opts.ceil;
    if (b3) vm.filters.score.max = vm.filters.score.opts.ceil;
    if (b4) vm.filters.packages.max = vm.filters.packages.opts.ceil;

    // Categories and shapes
    var newCat = [], newSha = [], old;
    cat.forEach(name => {
      old = vm.scatter.categories.filter(x => {return x.name == name});
      if (old.length == 1) newCat.push( old[0] );
      else newCat.push( {name:name, color:null, marked:false} );
    });
    sha.forEach(name => {
      old = vm.scatter.shapes.filter(x => {return x.name == name});
      if (old.length == 1) newSha.push( old[0] );
      else newSha.push( {name:name, shape:null, marked:false} );
    });
    vm.scatter.categories = newCat;
    vm.scatter.shapes = newSha;
    console.log(vm.scatter.data);
  }


  function removeCategory (name) {
    vm.scatter.categories = vm.scatter.categories.filter(cat => {
      return (cat.name != name);
    });
    vm.scatter.data = vm.scatter.data.filter(obj => {
      return (vm.scatter.getC(obj) != name);
    });
    if (vm.scatter.refresh) vm.scatter.refresh();
  }

  function removeShape (name) {
    vm.scatter.shapes = vm.scatter.shapes.filter(sha => {
      return (sha.name != name);
    });
    vm.scatter.data = vm.scatter.data.filter(obj => {
      return (vm.scatter.getS(obj) != name);
    });
    if (vm.scatter.refresh) vm.scatter.refresh();
  }

  function markCategory (obj) {
    obj.marked = !obj.marked;
    if (vm.scatter.categories.filter(cat => {return cat.marked}).length == 0)
      vm.categoryMarked = false;
    else
      vm.categoryMarked = true;
    applyFilter();
  }

  function markShape (obj) {
    obj.marked = !obj.marked;
    if (vm.scatter.shapes.filter(sha => {return sha.marked}).length == 0)
      vm.shapeMarked = false;
    else
      vm.shapeMarked = true;
    applyFilter();
  }

  function applyFilter () {
    var categories, shapes;
    if (vm.categoryMarked) 
      categories = vm.scatter.categories.filter(cat => { return cat.marked }).map(cat => {return cat.name});
    if (vm.shapeMarked)
      shapes = vm.scatter.shapes.filter(sha => { return sha.marked }).map(sha => {return sha.name});

    vm.scatter.data.forEach(image => {
      image.active = (( !vm.categoryMarked || categories.includes( vm.scatter.getC(image) ) ) && 
                      ( !vm.shapeMarked || shapes.includes( vm.scatter.getS(image) ) ) &&
                      image.full_size <= vm.filters.size.max &&
                      image.full_size >= vm.filters.size.min && 
                      image.vuln <= vm.filters.vuln.max &&
                      image.vuln >= vm.filters.vuln.min &&
                      image.value <= vm.filters.score.max &&
                      image.value >= vm.filters.score.min &&
                      image.packages <= vm.filters.packages.max &&
                      image.packages >= vm.filters.packages.min &&
                      ( image.name.includes(vm.filters.text) ||
                        image.operating_system.includes(vm.filters.text) ||
                        image.parent.full_name.includes(vm.filters.text) ||
                        image.parent.description.includes(vm.filters.text) //TODO desc
                      ));
    });

    if (vm.scatter.refresh) vm.scatter.refresh();
  }

  var parseDate = d3.time.format("%Y-%m-%dT%H:%M:%S").parse;
  function search () {
    http.post('https://api.mosorio.me/api/v1/viz', {user: vm.searchTerm}).then(
      function onSuccess (response) {
        if (response.data.count == 0)
          vm.noResults = true;
        else {
          vm.noResults = false;
          var first = (vm.scatter.raw.length == 0);
          var filtered = response.data.result.children.filter(obj => { return (obj.children); });

          filtered.forEach(repo => {
            repo.active = true;
            repo.children = repo.children.filter(obj => { return (obj.last_updated); });
            repo.children.forEach( image => {
              computeScore(image);
              image.active = true;
              image.parent = repo;
              image.date = parseDate( image.last_updated.split('.')[0] );
              image.vuln = image.vulnerabilities_critical +
                           //image.vulnerabilities_defcon1 +
                           image.vulnerabilities_high +
                           image.vulnerabilities_low +
                           image.vulnerabilities_medium;// +
                           /*image.vulnerabilities_negligible +
                           /image.vulnerabilities_unknown;*/
            });
            vm.scatter.raw.push(repo);
          });

          var sorted, uniq, lastValue;
          filtered.forEach(repo => {
            sorted = repo.children.sort((a,b) => { return b.date - a.date; });
            uniq = [];
            sorted.forEach(img => {
              if (img.vuln != lastValue) {
                uniq.push(img);
              }
              lastValue = img.vuln;
            });
            repo.children = uniq;
          })

          updateData();
          vm.show.categories= true;
          vm.show.shapes= true;
          vm.show.filters= true;

          if (first) vm.scatter.start();
          else vm.scatter.refresh();
        }
      },
      function onError (response) { console.log('Error: ' + response.data); }
    );
  };

  function computeScore (img) {
    img.score = 1000;
    if (img.vulnerabilities_critical > 0) img.score -= 100 - 50 * (1-Math.min(img.vulnerabilities_critical, 5));
    if (img.vulnerabilities_high > 0)     img.score -=  50 - 25 * (1-Math.min(img.vulnerabilities_high, 9));
    if (img.vulnerabilities_medium > 0)   img.score -=  30 - 20 * (1-Math.min(img.vulnerabilities_medium, 15));
    if (img.vulnerabilities_low > 0)      img.score -=  20 - 10 * (1-Math.min(img.vulnerabilities_low, 23));
    if (img.score < 0 ) img.score = 0;

    if (img.score > 900) {
      img.letter = (img.score == 1000) ? 'A+' : 'A';
      img.letterColor = '#2c7bb6';
    } else if (img.score > 800) {
      img.letter = 'B';
      img.letterColor = '#abd9e9';
    } else if (img.score > 700) {
      img.letter = 'C';
      img.letterColor = '#ffffbf';
    } else if (img.score > 600) {
      img.letter = 'D';
      img.letterColor = '#fdae61';
    } else {
      img.letter = 'F';
      img.letterColor = '#d7191c';
    }
  }

  function getPackages (image) {
    var ctrl = vm.details;
    var id = image.id;
    vm.selected = image;
    ctrl.data = {Critical: [], High: [], Medium: [], Low: []};
    http.get('https://api.mosorio.me/api/v1/images/'+id+'/packages').then(
      function onSuccess (response) {
        var s, p, i, j, target;
        if (response.data.length > 0) {
          vm.show.details = true;
          vm.show.filters = false;
        } else {
          vm.show.details = false;
        }
        for (i in response.data) {
          s = response.data[i];
          for (j in s.vulnerabilities) {
            p = s.vulnerabilities[j];
            switch (p.severity) {
              case 'Critical':
              case 'Defcon1':
                target = ctrl.data.Critical;
                break;
              case 'High':
                target = ctrl.data.High;
                break;
              case 'Medium':
                target = ctrl.data.Medium;
                break;
              case 'Low':
              case 'Negligible':
              case 'Unknown':
                target = ctrl.data.Low;
                break;
              default:
                console.log(p);
            }
            target.push({
              name: p.name,
              severity: p.severity,
              link: p.link,
              meta: p.metadata,
              package: s.name,
              version: s.version,
            });
          }
        }
        console.log(ctrl.data);
      },
      function onError (response) { console.log('Error: ' + response.data); }
    );
  }

  function formatBytes (a,b) {
    if (a <= 0) 
      return"0 B";
    var c = 1024,
        d = (b===0) ? 0 : (b || 2),
        e = ["B","KB","MB","GB","TB","PB","EB","ZB","YB"],
        f = Math.floor(Math.log(a)/Math.log(c));
    return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f]
  }

	$('#search-input').keypress(function(event){
		var keycode = (event.keyCode ? event.keyCode : event.which);
		if(keycode == '13'){
			search();
		}
	});

	$('#filter-input').keypress(function(event){
		var keycode = (event.keyCode ? event.keyCode : event.which);
		if(keycode == '13'){
      applyFilter();
		}
	});

  search();
}
