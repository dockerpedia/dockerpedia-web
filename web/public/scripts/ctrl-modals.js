angular.module('dockerpedia.controllers').controller('describeImageModal', describeImageModal);
describeImageModal.$inject = ['$scope','$uibModalInstance', 'image', 'extra', '$http']
function describeImageModal ($scope, $uibModalInstance, image, extra, $http) {
  var ctrl = this;
  ctrl.image = image;
  ctrl.getTitle = getTitle;
  ctrl.getLabel = getLabel;
  ctrl.getDescription = getDescription;
  ctrl.getLastUpdated = getLastUpdated;
  ctrl.getInstalledPackages = getInstalledPackages;
  ctrl.getSize = getSize;
  ctrl.getLetter = getLetter;
  ctrl.getColor = getColor;
  ctrl.getUrl = getUrl;
  ctrl.getVulnerabilities = getVulnerabilities;
  ctrl.hasData = hasData;

  ctrl.data = {Critical: [], High: [], Medium: [], Low: []};
  ctrl.active = {Critical: false, High: false, Medium: false, Low: false};

  getPackages(image.id);

  function getPackages (id) {
    $http.get('https://api.dockerpedia.inf.utfsm.cl/api/v1/images/'+id+'/packages').then(
      function onSuccess (response) {
        ctrl.data = {Critical: [], High: [], Medium: [], Low: []};
        var s, p, i, j, target;
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

  function hasData () {
    return (ctrl.data.Critical.length != 0 ||
            ctrl.data.High.length != 0 ||
            ctrl.data.Medium.length != 0 ||
            ctrl.data.Low.length != 0);
  }

  function getTitle () {
    return ctrl.image.parent.full_name;
  }

  function getLabel () {
    return ctrl.image.name;
  }

  function getDescription () {
    return ctrl.image.parent.description ? ctrl.image.parent.description : 'No description available';
  }

  function getLastUpdated () {
    return ctrl.image.last_updated ? ctrl.image.last_updated.split('T')[0]: 'Unknown';
  }

  function getInstalledPackages () {
    return ctrl.image.packages ? ctrl.image.packages: '?';
  }

  function getSize () {
    return extra.size ? extra.size : '?';
  }

  function getLetter () {
    return extra.letter;
  }

  function getColor () {
    return extra.color
  }

  function getUrl () {
    return "https://hub.docker.com/r/" + getTitle();
  }

  function getVulnerabilities () {
    return { 
      critical: image.vulnerabilities_critical+image.vulnerabilities_defcon1,
      high: image.vulnerabilities_high,
      medium: image.vulnerabilities_medium,
      low: image.vulnerabilities_low + image.vulnerabilities_negligible + image.vulnerabilities_unknown
    };
  }
}
