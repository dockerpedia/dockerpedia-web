angular.module('dockerpedia', [
  'dockerpedia.services',
  'dockerpedia.controllers',
  'dockerpedia.directives',
]);

angular.module('d3', []);
angular.module('dockerpedia.services', []);
angular.module('dockerpedia.controllers', []);
angular.module('dockerpedia.directives', ['d3']);
