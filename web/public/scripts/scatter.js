angular.module('dockerpedia.directives')
.directive(
  'scatter', 
  ['d3v3', function(d3) {
  return {
    restrict: 'EA',
    scope: { control: '=' },
    link: function(scope, element, attrs) {
/******************** D3 code here *******************/
      console.log('hello world')
      /**** MAIN ****/
      var width  =  920,
          height =  460;
      
      var x = d3.scale.linear()
         .range([0, width]);

      var y = d3.scale.linear()
         .range([height, 0]);

      var color = d3.scale.category10();      

      var xAxis = d3.svg.axis()
         .scale(x)
         .orient("bottom");

      var yAxis = d3.svg.axis()
         .scale(y)
         .orient("left");

      /** MAIN SVG **/
      var svg = d3.select(element[0]).append("svg")
            .attr("width", width+40+20)
            .attr("height", height+30+20)
         .append("g")
            .attr("transform", "translate(40,20)");;

      d3.csv("scripts/example.csv", function(error, data) {
         if (error) throw error;
         data.forEach(function(d) {
            d.hola = +d.hola;
            d.chao = +d.chao;
         });

         x.domain(d3.extent(data, function(d) { return d.hola; })).nice();
         y.domain(d3.extent(data, function(d) { return d.chao; })).nice();

         var colors = {};
         var types = [...new Set(data.map(function(d) {
            return d.type;
         }))];
         for(var key in types){
            colors[types[key]] = key;
         } 

         svg.append("g")
               .attr("class", "x axis")
               .attr("transform", "translate(0," + height + ")")
               .call(xAxis)
            .append("text")
               .attr("class", "label")
               .attr("x", width)
               .attr("y", -6)
               .style("text-anchor", "end")
               .text("Sepal Width (cm)");

         svg.append("g")
               .attr("class", "y axis")
               .call(yAxis)
            .append("text")
               .attr("class", "label")
               .attr("transform", "rotate(-90)")
               .attr("y", 6)
               .attr("dy", ".71em")
               .style("text-anchor", "end")
               .text("Sepal Length (cm)")

         /*svg.selectAll(".dot")
               .data(data)
            .enter().append("circle")
               .attr("class", "dot")
               .attr("r", function(d) { return d.holi; })
               .attr("cx", function(d) { return x(d.hola); })
               .attr("cy", function(d) { return y(d.chao); })
               .style("fill", function(d) { return color(d.type); })
            .on("mouseover",function(d){ 
               d3.select(this)
                 .transition()
                   .attr("stroke-width","5px")
                   .attr("r",20);
            })
            .on("mouseout",function(){ 
               d3.select(this).transition()
                  .delay(100)
                  .attr("stroke-width","0px")
                  .attr("r", function(d) { return d.holi; });
            });*/
            svg.selectAll(".point")
                  .data(data)
               .enter().append("path")
                  .attr("class", "point")
                  .attr("d", function(d) { return d3.svg.symbol().type(d3.svg.symbolTypes[colors[d.type]%6]); })
                  .attr("transform", function(d) { return "translate(" + x(d.hola) + "," + y(d.chao) + ")"; })
                  .attr("fill", function(d) { return color(d.type) });

         var legend = svg.selectAll(".legend")
               .data(color.domain())
            .enter().append("g")
               .attr("class", "legend")
               .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

         legend.append("rect")
            .attr("x", width - 18)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", color);

         legend.append("text")
            .attr("x", width - 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text(function(d) { return d; });

        });

/*****************************************************/
    }
  };
}]);
