angular.module('dockerpedia.directives').directive('shape', shape);

shape.$inject = ['d3v3'];

function shape (d3) {
  var directive = {
    link: link,
    restrict: 'EA',
    scope: {
      type: '=',
    },
  };
  return directive;

  function link (scope, element, attrs) {
    var svg = d3.select(element[0])
      .append("svg")
        .attr("width", 20)
        .attr("height", 20)

    svg.append("path")
      .attr("d", d3.svg.symbol()
        .size(150)
        .type(scope.type))
      .style("fill", 'grey')
      .attr("transform", "translate(10,10)");
  }
}
