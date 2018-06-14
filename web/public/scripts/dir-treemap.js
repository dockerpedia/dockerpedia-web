angular.module('dockerpedia.directives').directive('treemap', treemap);

treemap.$inject = ['d3v3'];

function treemap (d3) {
  var directive = {
    link: link,
    restrict: 'EA',
    scope: { 
      update: '=',
      encoding: '=',
    },
  };
  return directive;

  function link (scope, element, attrs) {
    var divWidth = element[0].parentElement.offsetWidth;

    var margin = {top: 30, right: 0, bottom: 0, left: 0},
        width = divWidth - 30,
        height = 620 - margin.top - margin.bottom,
        formatNumber = d3.format(".3n"),
        colorDomain = [0, 1, 2],
        //colorRange = ['#91bfdb', '#ffffbf', '#fc8d59'], //http://colorbrewer2.org/#type=diverging&scheme=RdYlBu&n=3
        colorRange = ['#a1d76a', '#f7f7f7', '#e9a3c9'], //http://colorbrewer2.org/#type=diverging&scheme=RdYlBu&n=3
        transitioning;

	  // adding a color scale
	  var color = d3.scale.linear()
		    .domain(colorDomain)
		    .range(colorRange);

    function setColorDomain (root) {
      var min = 10000000000, max = 0;
      root.children.forEach( function (d) {
        if (d.full_size > max) max = d.full_size;
        if (d.full_size < min) min = d.full_size;
      });
      colorDomain[0] = min;
      colorDomain[1] = (min+max)/2;
      colorDomain[2] = max;
      color.domain(colorDomain);
    };

    function formatBytes (a,b) {
      if (0==a) 
        return"0 Bytes";
      var c = 1024,
          d = b || 2,
          e = ["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"],
          f = Math.floor(Math.log(a)/Math.log(c));
      return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f]
    }

    // sets x and y scale to determine size of visible boxes
    var x = d3.scale.linear()
      .domain([0, width])
      .range([0, width]);

    var y = d3.scale.linear()
      .domain([0, height])
      .range([0, height]);


    // introduce color scale here
    var treemap = d3.layout.treemap()
      .children(function(d, depth) { return depth ? null : d._children; })
      .sort(function(a, b) { return a.value - b.value; })
      .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
      .round(false);

    var svg = d3.select("#chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.bottom + margin.top)
      .style("margin-left", -margin.left + "px")
      .style("margin.right", -margin.right + "px")
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .style("shape-rendering", "crispEdges");

    var grandparent = svg.append("g")
      .attr("class", "grandparent");

    grandparent.append("rect")
      .attr("y", -margin.top)
      .attr("width", width)
      .attr("height", margin.top);

    grandparent.append("text")
      .attr("x", 6)
      .attr("y", 6 - margin.top)
      .attr("dy", ".75em");

    var legendWidth = document.getElementById('legend').parentElement.offsetWidth;
    var legend = d3.select("#legend").append("svg")
      .attr("width", legendWidth - 30)
      .attr("height", 30)
      .attr('class', 'legend')
      .selectAll("g")
        .data(['A','B','C','D','F']) //line 225
        .enter()
        .append('g')

    // functions
    function initialize(root) {
      root.x = root.y = 0;
      root.dx = width;
      root.dy = height;
      root.depth = 0;
      }


    // Aggregate the values for internal nodes. This is normally done by the
    // treemap layout, but not here because of our custom implementation.
    // We also take a snapshot of the original children (_children) to avoid
    // the children being overwritten when when layout is computed.
    function accumulate(d) {
      return (d._children = d.children)
      // recursion step, note that p and v are defined by reduce
          ? d.value = d.children.reduce(function(p, v) {return 0 + accumulate(v); }, 0)
          : d.value;
      }

    // Compute the treemap layout recursively such that each group of siblings
    // uses the same size (1×1) rather than the dimensions of the parent cell.
    // This optimizes the layout for the current zoom state. Note that a wrapper
    // object is created for the parent node for each group of siblings so that
    // the parent’s dimensions are not discarded as we recurse. Since each group
    // of sibling was laid out in 1×1, we must rescale to fit using absolute
    // coordinates. This lets us use a viewport to zoom.
    function layout(d) {
      if (d._children) {
        // treemap nodes comes from the treemap set of functions as part of d3
        treemap.nodes({_children: d._children});
        d._children.forEach(function(c) {
        c.x = d.x + c.x * d.dx;
        c.y = d.y + c.y * d.dy;
        c.dx *= d.dx;
        c.dy *= d.dy;
        c.parent = d;
        // recursion
        layout(c);
        });
      }
    }

    function colorIncrements(d){
      return (colorDomain[colorDomain.length - 1] - colorDomain[0])/4*d + colorDomain[0];
    }

    function createLegend () {
      legend.append("rect")
        .attr("x", function(_,d) { return legendWidth - 530 - margin.left + d * 100})
        .attr("y", 0)
        .attr("fill", function(d) { 
          return letterToColor(d);
          //return color(colorIncrements(d))
        })
        .attr('width', '100px')
        .attr('height', '40px')

      legend.append("text")
          .text(function(d){
            return d;
            //return formatBytes(colorIncrements(d))
          })
          .attr('y', 20)
          .attr('x', function(_,d){return legendWidth - 530 - margin.left + d * 100 + 40});
    }

    // determines if white or black will be better contrasting color
    function getContrast50(hexcolor){
      return (parseInt(hexcolor.replace('#', ''), 16) > 0xffffff/3) ? 'black':'white';
    }

    scope.update = function(root) {
      console.log(root);
      setColorDomain(root);
      computeScore(root);
      computeValue(root);
      initialize(root);
      accumulate(root);
      layout(root);
      display(root);
      createLegend();

      function display(d) {
        grandparent
          .datum(d.parent)
          .on("click", transition)
          .select("text")
          .text(name(d))

        // color header based on grandparent's color
        grandparent
          .datum(d.parent)
          .select("rect")
          .attr("fill", function(){
            if (d.parent)
              return letterToColor(scoreToLetter(d));
            return 'darkgray';
            /*if ( (fs = parseFloat(d.full_size)) ) {
              return color(fs);
            }
            return 'darkgray';*/
          })

        var g1 = svg.insert("g", ".grandparent")
          .datum(d)
          .attr("class", "depth");

        var g = g1.selectAll("g")
          .data(d._children)
            .enter().append("g");

        g.filter(function(d) { return d._children; })
          .classed("children", true)
          .on("click", transition);

        g.selectAll(".child")
          .data(function(d) { return d._children || [d]; })
          .enter().append("rect")
          .attr("class", "child")
          .call(rect);


        g.append("rect")
          .attr("class", "parent")
          .call(rect)
          .append("title");

        /* Adding a foreign object instead of a text object, allows for text wrapping */
        g.append("foreignObject")
            .call(rect)
            /* open new window based on the json's URL value for leaf nodes */
            /* Firefox displays this on top
            .on("click", function(d) {
              if(!d.children){
                window.open(d.url);
            }
          })*/
          .attr("class","foreignobj")
          .append("xhtml:div")
          .attr("dy", ".75em")
          .html(function(d) {
            var title;
            if (d.full_name) title = ' <p class="title"> ' + d.full_name + '</p>'
            else title = '';
            return title + 
            ' <p class="title"> ' + d.name + '</p>' +
            ' <p> Last updated : ' + (d.last_updated ? d.last_updated.split('T')[0]: 'unknown') +
            ' <p> Best image score : ' + scoreToLetter(d) + //' (' + d.value + ')' +
            ' <p> Image size: ' + formatBytes(d.full_size);
            ;})
          .attr("class","textdiv"); //textdiv class allows us to style the text easily with CSS

        function transition(d) {
          if (transitioning || !d) return;
          transitioning = true;

          var g2 = display(d),
            t1 = g1.transition().duration(650),
            t2 = g2.transition().duration(650);

          // Update the domain only after entering new elements.
          x.domain([d.x, d.x + d.dx]);
          y.domain([d.y, d.y + d.dy]);

          // Enable anti-aliasing during the transition.
          svg.style("shape-rendering", null);

          // Draw child nodes on top of parent nodes.
          svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

          // Fade-in entering text.
          g2.selectAll("text").style("fill-opacity", 0);
          g2.selectAll("foreignObject div").style("display", "none"); /*added*/

          // Transition to the new view.
          t1.selectAll("text").call(text).style("fill-opacity", 0);
          t2.selectAll("text").call(text).style("fill-opacity", 1);
          t1.selectAll("rect").call(rect);
          t2.selectAll("rect").call(rect);

          /* Foreign object */
          t1.selectAll(".textdiv").style("display", "none"); /* added */
          t1.selectAll(".foreignobj").call(foreign); /* added */
          t2.selectAll(".textdiv").style("display", "block"); /* added */
          t2.selectAll(".foreignobj").call(foreign); /* added */

          // Remove the old node when the transition is finished.
          t1.remove().each("end", function() {
          svg.style("shape-rendering", "crispEdges");
          transitioning = false;
          });
        }

        return g;
      }

      function text(text) {
      text.attr("x", function(d) { return x(d.x) + 6; })
      .attr("y", function(d) { return y(d.y) + 6; });
    }

      function rect(rect) {
      rect.attr("x", function(d) { return x(d.x); })
        .attr("y", function(d) { return y(d.y); })
        .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
        .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); })
        .attr("fill", function(d){
          return letterToColor(scoreToLetter(d));
          //return color(parseFloat(d.full_size));
          });
      }

      function foreign(foreign){ /* added */
        foreign.attr("x", function(d) { return x(d.x); })
        .attr("y", function(d) { return y(d.y); })
        .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
        .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
      }

      function name(d) {
      return d.parent
        ? "Vulnerabilities for package - " + d.name + " - Click to zoom out."
        : "Vulnerabilities for packages.";
      }

      function nameSave(d) {
      return d.parent
        ? name(d.parent) + " - " + d.name + " -  Click to zoom out."
        : d.name;
      }

    };

    function scoreToLetter (d) {
      if (d.score == 1000) return 'A+';
      if (d.score > 900) return 'A';
      if (d.score > 800) return 'B';
      if (d.score > 700) return 'C';
      if (d.score > 600) return 'D';
      return 'F';
    }

    function computeScore (root) {
      root.children.forEach( function (d) {
        d.score = 0;
        d.children.forEach( function (l) {
          l.score = 1000;
          if (l.vulnerabilities_critical > 0) l.score -= 100 - 50 * (1-Math.min(l.vulnerabilities_critical, 5));
          if (l.vulnerabilities_high > 0)     l.score -=  50 - 25 * (1-Math.min(l.vulnerabilities_high, 9));
          if (l.vulnerabilities_medium > 0)   l.score -=  30 - 20 * (1-Math.min(l.vulnerabilities_medium, 15));
          if (l.vulnerabilities_low > 0)      l.score -=  20 - 10 * (1-Math.min(l.vulnerabilities_low, 23));
          if (l.score < 0 ) l.score = 0;
          d.score += l.score;
        });
        d.score /= d.children.length;
      });
    }

    function computeValue (root) {
      if (!root.children || !root.children[0].children) return;
      var maxSize = 0, minSize = root.children[0].children[0].full_size,
          maxPull = 0, minPull = root.children[0].pull_count;
      root.children.forEach( function (d) {
        if (d.pull_count < minPull) minPull = d.pull_count;
        if (d.pull_count > maxPull) maxPull = d.pull_count;
        d.children.forEach( function (l) {
          if (l.full_size < minSize) minSize = l.full_size;
          if (l.full_size > maxSize) maxSize = l.full_size;
        });
      });

      /* TODO: revisar bien esto por que está a medias.*/
      var encoding = scope.encoding,
          tmpSize, sumSize;
      root.children.forEach( function (d) {
        d.value = (encoding.popularity) ? 100 * (d.pull_count - minPull)/(maxPull-minPull) : 0;
        sumSize = 0;
        d.children.forEach( function (l) {
          l.value = (encoding.popularity) ? d.value : 0;
          if (encoding.size) {
            tmpSize = 100 - 100 * (l.full_size - minSize)/(maxSize-minSize);
            sumSize += tmpSize;
            l.value += tmpSize;
          }
          if (encoding.vulnerabilities) l.value += l.score;
        });
        if (encoding.size) d.value += sumSize/d.children.length;
        if (encoding.vulnerabilities) d.value += d.score;
      });
    }

    function letterToColor (letter) {
      if (letter == 'A' || letter == 'A+') return '#2c7bb6';
      if (letter == 'B') return '#abd9e9';
      if (letter == 'C') return '#ffffbf';
      if (letter == 'D') return '#fdae61';
      if (letter == 'F') return '#d7191c';
      return 'darkgray';
    }

  }
}
