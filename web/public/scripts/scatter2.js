angular.module('dockerpedia.directives').directive('scatter', scatter);

scatter.$inject = ['d3v3'];

function scatter (d3) {
  var directive = {
    link: link,
    restrict: 'EA',
    scope: {
      update: '=',
      details: '='
    },
  };
  return directive;

  function link (scope, element, attrs) {
    var parentWidth = element[0].parentElement.offsetWidth;

    var margin = {top: 15, right: 15, bottom: 40, left: 54},
        width = parentWidth - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom;

    // setup x (as Date)
    var parseDate = d3.time.format("%Y-%m-%d").parse;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var lastYear = 0;
    var xValue = function(d) { return d.getX();}, // data -> value
        xScale = d3.time.scale().range([0, width]), // value -> display
        xMap = function(d) { return xScale(xValue(d));}, // data -> display
        xAxis = d3.svg.axis().scale(xScale)
          .tickSize(16, 0)
          .tickFormat(function (d) { 
            var tick;
            if (lastYear != d.getFullYear() && lastYear != 0) {
              tick = d.getFullYear();
            } else {
              tick = monthNames[d.getMonth()];
            }
            lastYear = d.getFullYear();
            return tick;
          })
          .orient("bottom");

    // setup y
    var yValue = function(d) { return d.getY();}, // data -> value
        yScale = d3.scale.linear().range([height, 0]), // value -> display
        yMap = function(d) { return yScale(yValue(d));}, // data -> display
        yAxis = d3.svg.axis().scale(yScale).orient("left");

    // setup fill color
    var cValue = function(d) { return d.type;},
        color = d3.scale.category10();

    // add the tooltip area to the webpage
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    var svg = null;

    // load data
    function start (data, repos, enc) {
      lastYear = 0;
      if (color) color = d3.scale.category10();
      if (svg) {
        //d3.select("#scatter-svg").remove();
        svg.selectAll(".legend").remove();
        var tmp = document.getElementById("scatter-svg");
        tmp.parentNode.removeChild(tmp);
      }
      svg = d3.select(element[0]).append("svg")
        .attr("id", "scatter-svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // don't want dots overlapping axis, so add in buffer to data domain
      //xScale.domain([d3.min(data, xValue)-1, d3.max(data, xValue)+1]);
      //xScale.domain(d3.extent(data, function(d) { return d.date; }));
      var dom = d3.extent(data, function(d) { return d.getX(); });
      xScale.domain([d3.time.month.offset(dom[0], -1), d3.time.month.offset(dom[1], +1)]);
      yScale.domain([d3.min(data, yValue)-1, d3.max(data, yValue)+1]);

      // x-axis
      var xx = svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);
      xx.append("text")
          .attr("class", "label")
          .attr("x", width/2)
          .attr("y", 35)
          .text(enc.xName);
      xx.selectAll(".tick text")
          .style("text-anchor", "start")
          .attr("x", 6)
          .attr("y", 6);
      
      // y-axis
      svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
        .append("text")
          .attr("class", "label")
          .attr("transform", "rotate(-90)")
          .attr("x", -height/2)
          .attr("y", -52)
          .attr("dy", ".71em")
          .text(enc.yName);

      // draw dots
      svg.selectAll(".dot")
          .data(data)
        .enter().append("circle")
          .attr("class", "dot")
          .attr("r", 5.5)
          .attr("cx", xMap)
          .attr("cy", yMap)
          .style("fill", function(d) { return color(cValue(d));}) 
          .on("click", function (d) { scope.details(d.id) })
          .on("mouseover", function(d) {
            var tip = "<h6>" + d.type + ":" + d.name + "</h6><hr>" +
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

      // draw legend
      var legend = svg.selectAll(".legend")
          .data(color.domain())
        .enter().append("g")
          .attr("class", "legend")
          .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; })
          .on("click", function (d) {console.log(d);})
          .on("mouseover", function(d) {
            var tip = "<h6>" + d + "</h6><hr>";
            if (repos[d].description) tip += "<i>" + repos[d].description + "</i><br/>";
            tip += "<b> Downloads: </b>" + repos[d].pull_count + "<br/>";
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

      // draw legend colored rectangles
      legend.append("rect")
          .attr("x", width - 18)
          .attr("width", 18)
          .attr("height", 18)
          .style("fill", color);

      // draw legend text
      legend.append("text")
          .attr("x", width - 24)
          .attr("y", 9)
          .attr("dy", ".35em")
          .style("text-anchor", "end")
          .text(function(d) { return d;})
    };

    /* External */
    scope.update = function (root) {
      var i, j, repo, image;
      var tmp, data = [], count = 0, repos = {};
      var enc = {y: 'vuln', yName: 'Vulnerabilities', x: 'date', xName: 'Date'};
      for (i in root.children) {
        repo = root.children[i];
        repos[repo.name] = repo;
        for (j in repo.children) {
          image = repo.children[j];
          if (image.last_updated) {
            split_date = image.last_updated.split('T');
            image.type = repo.name;
            image.date = parseDate( split_date[0] );
            image.vuln = image.vulnerabilities_critical +
                        image.vulnerabilities_defcon1 +
                        image.vulnerabilities_high +
                        image.vulnerabilities_low +
                        image.vulnerabilities_medium +
                        image.vulnerabilities_negligible +
                        image.vulnerabilities_unknown;
            image.getY = function () {return this[enc.y]; };
            image.getX = function () {return this[enc.x]; };
            if (image.vuln !=0 || image.name == "latest") data.push(image);
          }
        }
      }
      console.log(data);
      start(data, repos, enc);
    };
  }
}
