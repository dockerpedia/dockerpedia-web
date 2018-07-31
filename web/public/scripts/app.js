angular.module('dockerpedia', [
  'rzModule',
  'ui.bootstrap',
  'dockerpedia.services',
  'dockerpedia.controllers',
  'dockerpedia.directives',
]);

angular.module('d3v3', []);
angular.module('dockerpedia.services', []);
angular.module('dockerpedia.controllers', []);
angular.module('dockerpedia.directives', ['d3v3']);
