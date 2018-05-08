angular.module('dockerpedia.directives')
.directive(
  'scatter', 
  ['d3', function(d3) {
  return {
    restrict: 'EA',
    scope: { control: '=' },
    link: function(scope, element, attrs) {
/******************** D3 code here *******************/
      console.log('hello word')
      /**** MAIN ****/
      var width  =  780,
          height =  610;

      /** MAIN SVG **/
      var svg = d3.select(element[0]).append("svg")
            .attr("width", width)
            .attr("height", height);

/*****************************************************/
    }
  };
}]);
