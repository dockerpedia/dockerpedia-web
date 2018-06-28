angular.module('dockerpedia.controllers').controller('describeImageModal', describeImageModal);
describeImageModal.$inject = ['$scope','$uibModalInstance', 'image', 'extra']
function describeImageModal ($scope, $uibModalInstance, image, extra) {
  var ctrl = this;
  ctrl.image = image;
  console.log(image);
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
