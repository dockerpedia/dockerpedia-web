angular.module('dockerpedia.directives').directive('scatter', scatter);

scatter.$inject = ['d3v3'];

function scatter (d3) {
  var directive = {
    link: link,
    restrict: 'EA',
    scope: {
      binding: '=',
      details: '=',
    },
  };
  return directive;

  function link (scope, element, attrs) {
    scope.binding.start = start;
    // add the tooltip area to the webpage
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    function createTip (d) {
      var tip = "<h6>" + d.parent.name + ":" + d.name + "</h6><hr>" +
`<table class="image-table">
  <tr">
    <td rowspan="2" style="border-right: 1px solid black; padding-right:4px;">
      <b> Risk:</b> <span class="risk-text risk-`+d.risk+`">`+ d.risk +`</span></td>
    <td style="padding-left:4px;"><b>Packages:&nbsp;</b>`+d.packages+`</td>
  </tr>
  <tr>
    <td style="padding-left:4px;"><b>Updated:&nbsp;</b>`+d.last_updated.split('T')[0]+`</td>
  </tr>
  <tr>
    <td style="border-right: 1px solid black; padding-right:4px;"><b>Vulnerabilities:</b>`+d.vuln+`</td>
    <td style="padding-left:4px;"><b>Image size:&nbsp;</b>`+scope.binding.toBytes(d.full_size)+`</td>
  </tr>
</table>`;
      return tip;
    }
    
    var parentWidth = element[0].parentElement.offsetWidth;

    var margin = { top: 15, right: 15, bottom: 50, left: 70 },
        outerWidth = parentWidth,
        outerHeight = 600,
        width = outerWidth - margin.left - margin.right,
        height = outerHeight - margin.top - margin.bottom;

    /*var x = d3.scale.linear() if x is not time.
        .range([0, width]).nice();*/
    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]).nice();

    var getX, getY, getR, getC, getS, yTick;

    function updateCfg () {
      //data = scope.binding.data;
      getX = scope.binding.getX;
      getY = scope.binding.getY;
      getR = scope.binding.getR;
      getC = scope.binding.getC;
      getS = scope.binding.getS;
      yTick = scope.binding.yTick;
    }

    function updateCategories (color) {
      scope.binding.categories.forEach(cat => {
        cat.color = color(cat.name);
      });
      scope.binding.shapes.forEach(sha => {
        sha.shape = getShape(sha.name);
      });
    }

    function getXDomain () {
      var filtered = scope.binding.data.filter(d => {return d.active});
      var xExtent = d3.extent(filtered, function(d) { return getX(d); }),
          xMin = d3.time.month.offset(xExtent[0], -1),
          xMax = d3.time.month.offset(xExtent[1], +1);
      return [xMin, xMax];
    }

    function getYDomain () {
      var filtered = scope.binding.data.filter(d => {return d.active});
      var yMax = 1.05 * d3.max(filtered, function(d) { return getY(d); }),
          yMin = 0.95 * d3.min(filtered, function(d) { return getY(d); }),
          yMin = yMin < -2 ? -2 : yMin;
      return [yMin, yMax];
    }

    var shapes = {};
    var shapeId = 0;
    function getShape (id) {
      if (!shapes[id]) {
        shapes[id] = d3.svg.symbolTypes[shapeId%d3.svg.symbolTypes.length];
        shapeId += 1;
      }
      return shapes[id];
    }

function start () {
  var tmp = document.getElementById("scatter-svg");
  if (tmp) tmp.parentNode.removeChild(tmp);
  updateCfg();

  x.domain(getXDomain());
  y.domain(getYDomain());

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .tickSize(-height);

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .tickSize(-width)
      .tickFormat(yTick);

  var d3color = d3.scale.category10();
  var color = function (token) {
    var c;
    switch (token) {
      case "none":
        c = '#2c7bb6';
        break;
      case "low":
        c = '#abd9e9';
        break;
      case "medium":
        c = '#ffffbf';
        break;
      case "high":
        c = '#fdae61';
        break;
      case "critical":
        c = '#d7191c';
        break;
      default:
        c = d3color(token);
    }
    return c;
  }

  var zoomBeh = d3.behavior.zoom()
      .x(x)
      .y(y)
      .scaleExtent([0, 500])
      .on("zoom", zoom);

  var svg = d3.select(element[0])
    .append("svg")
      .attr('id', 'scatter-svg')
      .attr("width", outerWidth)
      .attr("width", outerWidth)
      .attr("height", outerHeight)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .call(zoomBeh);

  svg.append("rect")
      .classed("scatter-rect", true)
      .attr("width", width)
      .attr("height", height);

  svg.append("g")
      .classed("x axis", true)
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .append("text")
      .classed("label", true)
      .attr("x", width)
      .attr("y", margin.bottom - 10)
      .style("text-anchor", "end")
      .text(scope.binding.xLabel);

  svg.append("g")
      .classed("y axis", true)
      .call(yAxis)
    .append("text")
      .classed("label", true)
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 10)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text(scope.binding.yLabel);

  var objects = svg.append("svg")
      .classed("objects", true)
      .attr("width", width)
      .attr("height", height);

  objects.append("svg:line")
      .classed("axisLine hAxisLine", true)
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", width)
      .attr("y2", 0)
      .attr("transform", "translate(0," + height + ")");

  objects.append("svg:line")
      .classed("axisLine vAxisLine", true)
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", height);

  objects.selectAll(".dot")
      .data(scope.binding.data)
        .enter().append("path")
      .classed("dot", true)
      .classed("active", d => {return d.active})
      .attr("d", d3.svg.symbol()
        .size(d => {return getR(d)})
        .type(d => {return getShape(getS(d)) }))
      .attr("transform", transform)
      .style("fill", function(d) { return color(getC(d)); })
      .on("click", function (d) { scope.details(d) })
      .on("mouseover", function(d) {
        tooltip.transition().duration(200).style("opacity", .9);
        tooltip.html(createTip(d))
            .style("left", (d3.event.pageX + 10) + "px")
            .style("top", (d3.event.pageY - 40) + "px");
      })
      .on("mouseout", function(d) {
        tooltip.transition().duration(500).style("opacity", 0);
      });

  function change() {
    //TODO: dots move around
    updateCfg();
    updateCategories(color);
    if (scope.binding.data.length == 0) {
      objects.selectAll(".dot").data(scope.binding.data).exit().remove();
      return null;
    }
    zoomBeh.x(x.domain(getXDomain()))
           .y(y.domain(getYDomain()));

    var svg = d3.select(element[0]).transition();
    // Update axis tick
    yAxis.tickFormat(yTick);
    // Update axis label
    svg.select(".x.axis").duration(750).call(xAxis).select(".label").text(scope.binding.xLabel);
    svg.select(".y.axis").duration(750).call(yAxis).select(".label").text(scope.binding.yLabel);

    var objs = objects.selectAll(".dot").data(scope.binding.data)
    // Remove old dots
    objs.exit().remove();

    // Create new dots
    objs.enter().append("path")
        .classed("dot", true)
        .on("click", function (d) { scope.details(d) })
        .on("mouseover", function(d) {
          tooltip.transition().duration(200).style("opacity", .9);
          tooltip.html(createTip(d))
              .style("left", (d3.event.pageX + 10) + "px")
              .style("top", (d3.event.pageY - 40) + "px");
        })
        .on("mouseout", function(d) {
          tooltip.transition().duration(500).style("opacity", 0);
        });

    // Update existing dots
    objs.classed("active", d => {return d.active });
    objs.transition().duration(1000)
        .style("fill", function(d) { return color(getC(d)); })
        .attr("d", d3.svg.symbol()
          .size(d => {return getR(d)})
          .type(d => {return getShape(getS(d)) }))
        .attr("transform", transform);
  }

  function zoom() {
    svg.select(".x.axis").call(xAxis);
    svg.select(".y.axis").call(yAxis);

    svg.selectAll(".dot")
        .attr("transform", transform);
  }

  function transform(d) {
    return "translate(" + x(getX(d)) + "," + y(getY(d)) + ")";
  }
  
  updateCategories(color);
  scope.binding.refresh = change;
}

  }
}
