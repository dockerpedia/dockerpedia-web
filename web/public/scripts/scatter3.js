angular.module('dockerpedia.directives').directive('scatter', scatter);

scatter.$inject = ['d3v3'];

function scatter (d3) {
  var directive = {
    link: link,
    restrict: 'EA',
    scope: {
      start: '=',
      update: '=',
      details: '=',
      ctrlData: '=',
    },
  };
  return directive;

  function link (scope, element, attrs) {
    scope.start = start;
    // add the tooltip area to the webpage
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
    
    var parentWidth = element[0].parentElement.offsetWidth;

    var margin = { top: 10, right: 20, bottom: 50, left: 50 },
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

    var data, getX, getY, getR, getC, getS;

    function updateCfg () {
      data = scope.ctrlData.data;
      getX = scope.ctrlData.getX;
      getY = scope.ctrlData.getY;
      getR = scope.ctrlData.getR;
      getC = scope.ctrlData.getC;
      getS = scope.ctrlData.getS;
    }

    function updateCategories (color) {
      var mySet = new Set();
      scope.ctrlData.categories = [];
      scope.ctrlData.data.forEach(obj => {
        mySet.add(scope.ctrlData.getC(obj));
      });
      mySet.forEach(name => {
        scope.ctrlData.categories.push( {name: name, color: color(name) } );
      });

      var mySet = new Set();
      scope.ctrlData.shapes = [];
      scope.ctrlData.data.forEach(obj => {
        mySet.add(scope.ctrlData.getS(obj));
      });
      mySet.forEach(name => {
        scope.ctrlData.shapes.push( {name: name, shape: getShape(name) } );
      });

    }

    function getXDomain () {
      var xExtent = d3.extent(data, function(d) { return getX(d); }),
          xMin = d3.time.month.offset(xExtent[0], -1),
          xMax = d3.time.month.offset(xExtent[1], +1);
      return [xMin, xMax];
    }

    function getYDomain () {
      var yMax = d3.max(data, function(d) { return getY(d); }) + 2,
          yMin = d3.min(data, function(d) { return getY(d); }),
          yMin = yMin > -2 ? -2 : yMin;
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
  updateCfg();
  console.log(data);
  /*var xExtent = d3.extent(data, function(d) { return getX(d); }),
      xMin = d3.time.month.offset(xExtent[0], -1),
      xMax = d3.time.month.offset(xExtent[1], +1);

  var yMax = d3.max(data, function(d) { return getY(d); }) * 1.05,
      yMin = d3.min(data, function(d) { return getY(d); }),
      yMin = yMin > 0 ? 0 : yMin;*/

  x.domain(getXDomain());// [xMin, xMax]);
  y.domain(getYDomain());//[yMin, yMax]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .tickSize(-height);

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .tickSize(-width);

  var color = d3.scale.category10();

  var zoomBeh = d3.behavior.zoom()
      .x(x)
      .y(y)
      .scaleExtent([0, 500])
      .on("zoom", zoom);

  var svg = d3.select(element[0])
    .append("svg")
      .attr("width", outerWidth)
      .attr("height", outerHeight)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .call(zoomBeh);

  /*var tip = d3.tip()
      .attr("class", "d3-tip")
      .offset([-10, 0])
      .html(function(d) {
        return xCat + ": " + d[xCat] + "<br>" + yCat + ": " + d[yCat];
      });

  svg.call(tip);*/

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
      .text(scope.ctrlData.xLabel);

  svg.append("g")
      .classed("y axis", true)
      .call(yAxis)
    .append("text")
      .classed("label", true)
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text(scope.ctrlData.yLabel);

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
      .data(data)
    .enter().append("path")
      .classed("dot", true)
      //.attr("d", d3.svg.symbol().type("triangle-up"))
      .attr("d", d3.svg.symbol()
        .size(d => {return getR(d)})
        .type(d => {return getShape(getS(d)) }))
      //.attr("r", function (d) { return 6 * Math.sqrt(getR(d) / Math.PI); })
      .attr("transform", transform)
      .style("fill", function(d) { return color(getC(d)); })
      //.on("click", d=>{console.log(d);})
      .on("click", function (d) { scope.details(d.id) })
      //tooltip
      .on("mouseover", function(d) {
        var tip = "<h6>" + d.parent.name + ":" + d.name + "</h6><hr>" +
                  "<b> Last updated: </b>" + d.last_updated.split("T")[0] + "<br/>" +
                  "<b> Vulnerabilities: </b>" + d.vuln + "<br/>";
        tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        tooltip.html(tip)
            .style("left", (d3.event.pageX + 10) + "px")
            .style("top", (d3.event.pageY - 40) + "px");
      })
      .on("mouseout", function(d) {
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
      })
      ;/*.on("mouseover", tip.show)
      .on("mouseout", tip.hide);*/

  /*var legend = svg.selectAll(".legend")
      .data(color.domain())
    .enter().append("g")
      .classed("legend", true)
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  legend.append("circle")
      .attr("r", 3.5)
      .attr("cx", width + 20)
      .attr("fill", color);

  legend.append("text")
      .attr("x", width + 26)
      .attr("dy", ".35em")
      .text(function(d) { return d; });*/

  function change() {
    updateCfg();
    zoomBeh.x(x.domain(getXDomain()))
           .y(y.domain(getYDomain()));

    var svg = d3.select(element[0]).transition();
    // Update axis label
    svg.select(".x.axis").duration(750).call(xAxis).select(".label").text(scope.ctrlData.xLabel);
    svg.select(".y.axis").duration(750).call(yAxis).select(".label").text(scope.ctrlData.yLabel);
    // Remove old dots
    objects.selectAll(".dot").data(data).exit().remove();
    // Update existing dots
    objects.selectAll(".dot").transition().duration(1000)
        .style("fill", function(d) { return color(getC(d)); })
        .attr("d", d3.svg.symbol()
          .size(d => {return getR(d)})
          .type(d => {return getShape(getS(d)) }))
        .attr("transform", transform);
    // Create new dots
    objects.selectAll(".dot").data(data).enter().append("path")
        .classed("dot", true)
        .attr("d", d3.svg.symbol()
          .size(d => {return getR(d)})
          .type(d => {return getShape(getS(d)) }))
        .attr("transform", transform)
        .style("fill", function(d) { return color(getC(d)); })
        //.on("click", d=>{console.log(d);});
        .on("click", function (d) { scope.details(d.id) })
        .on("mouseover", function(d) {
          var tip = "<h6>" + d.parent.name + ":" + d.name + "</h6><hr>" +
                    "<b> Last updated: </b>" + d.last_updated.split("T")[0] + "<br/>" +
                    "<b> Vulnerabilities: </b>" + d.vuln + "<br/>";
          tooltip.transition()
              .duration(200)
              .style("opacity", .9);
          tooltip.html(tip)
              .style("left", (d3.event.pageX + 10) + "px")
              .style("top", (d3.event.pageY - 40) + "px");
        })
        .on("mouseout", function(d) {
          tooltip.transition()
              .duration(500)
              .style("opacity", 0);
        });
      
    updateCategories(color);
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
  scope.ctrlData.refresh = change;
}



  }
}
