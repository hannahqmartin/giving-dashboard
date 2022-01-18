var nameNoSpaces = function(name) {
  return name.toLowerCase().split(" ").join("");
}

Promise.all([
  d3.json('data/donations.json')
]).then(function(data) {
  let donations = data[0];
  console.log(donations);

  const circleRadius = 2.5,
        labelYOffset = 10,
        indicatorPadding = 15,
        chartPadding = 15;

  const graphWidth = ($("#container").width() - 2 * indicatorPadding - 4 * chartPadding - 40) / 2

  const margin = {top: 20, right: 30, bottom: 20, left: 30},
    width = graphWidth - margin.left - margin.right,
    height = graphWidth / 2 - margin.top - margin.bottom;

  donations.forEach(function(n){
    n.measures.forEach(function(d){
      d.data.values.forEach(function(v){
        v.value = +v.value;
      });
      d.parseDate = d3.timeParse(d.data.date_format);
      let xExtent = d3.extent(d.data.values, function(v){
        return d.parseDate(v.date);
      })
      let yExtent = d3.extent(d.data.values, function(v){
        return v.value;
      })
      d.xScale = d3.scaleTime()
        .range([0, width])
        .domain(xExtent)
      d.yScale = d3.scaleLinear()
        .range([height - margin.bottom, margin.top])
        .domain(yExtent)
      d.line = line = d3.line()
        // .curve(d3.curveMonotoneX)
        .x(function(v){
          return d.xScale(d.parseDate(v.date))
        })
        .y(function(v){
          return d.yScale(v.value)
        })
      d.xAxis = d3.axisBottom()
          .tickFormat(d3.timeFormat(d.data.date_format))
          .ticks(d.data.values.length)
          .scale(d.xScale);

      d.data.values.forEach(function(v){
        v.cx = d.xScale(d.parseDate(v.date));
        v.cy = d.yScale(v.value);
        v.label = v.value + d.data.unit;
      });
    })
  })

  const divs = d3.select("#dashboard")
    .selectAll(".indicator")
    .data(donations)
    .join("div")
      .attr("class", "indicator")
      .attr("id", function(d){
        return nameNoSpaces(d.name);
      })
      .style("margin", "0px " + indicatorPadding + "px")
      // .style("padding", indicatorPadding + "px 0px")

  divs.append("div")
    .attr("class", "summary")
    .html(function(d){
      let nMeasures = d.measures.length;
      let textMeasures;
      if (nMeasures === 1) {
        textMeasures = "measure";
      } else {
        textMeasures = "measures";
      }
      return '<span class="summary-name">' + d.name + '</span><span class="summary-measures">' + d.measures.length + " " + textMeasures + '</span>';
    })
    .on("click", function(event, d){
      let details = d3.select("#" + nameNoSpaces(d.name) + " .details");
      details.classed("show", !details.classed("show"));

      details.selectAll(".label")
        .attr("x", function(d){
          let rect = d3.select(this).node().getBoundingClientRect();
          return d.cx - rect.width / 2;
        })
    })

  const divInfo = divs.append("div")
    .attr("class", "details")

  divInfo.append("div")
    .attr("class", "description")
      .html(function(d){
        return d.description;
      })

  const graphsDiv = divInfo.append("div")
    .attr("class", "graphs")

  const rowDivs = graphsDiv.selectAll("div")
    .data(function(d){
      return d.measures.reduce(function(result, value, index, array) {
        if (index % 2 === 0)
          result.push(array.slice(index, index + 2));
        return result;
      }, []);
    })
    .join("div")
      .attr("class", "row")

  const graphDiv = rowDivs.selectAll(".graph")
    .data(function(d){
      return d;
    })
    .join("div")
      .attr("class", "graph")
      .style("display", "inline-block")
      .style("max-width", (graphWidth - 1) + "px")
      .style("padding", "0px " + chartPadding + "px")

  graphDiv.append("div")
    .attr("class", "title")
    .html(function(d){
      return d.name;
    })

  graphDiv.append("div")
    .attr("class", "unit")
    .html(function(d){
      return d.data.unit_string;
    })

  const graphs = graphDiv.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.left + margin.right)

  const g = graphs.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

  // g.append("text")
  //   .attr("class", "title")
  //   .text(function(d){
  //     return d.name
  //   });

  g.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (margin.top + height - margin.bottom) + ")")
    .each(function(d, i){
      d3.select(this).call(d.xAxis);
    });

  g.selectAll(".tick line")
    .remove()

  g.append("path")
    .attr("fill", "none")
    .attr("stroke-width", 1.0)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .style("mix-blend-mode", "multiply")
    .attr("opacity", 1.0)
    // .attr("class", d => "curve "+nameNoSpaces(d.Sector))
    .attr("stroke",  "steelblue")
    .attr("d", function(d){
      return d.line(d.data.values)
    });

  g.selectAll("circle")
    .data(function(d){
      return d.data.values;
    })
    .join("circle")
      .attr("fill", "steelblue")
      .attr("cx", function(d){
        return d.cx;
      })
      .attr("cy", function(d){
        return d.cy;
      })
      .attr("r", circleRadius)

  g.selectAll(".label")
    .data(function(d){
      return d.data.values;
    })
    .join("text")
      .attr("class", "label")
      // .attr("fill", "steelblue")
      .style("text-align", "middle")
      .text(function(d){
        return d.label;
      })
      .attr("x", function(d){
        let rect = d3.select(this).node().getBoundingClientRect();
        return d.cx - rect.width / 2;
      })
      .attr("y", function(d){
        return d.cy - labelYOffset;
      })
      // .attr("r", circleRadius)

  graphDiv.append("div")
    .attr("class", "source")
    .html(function(d){
      return '<span>Source:</span> <a href="' + d.source_url + '" target="_blank">' + d.source + '</a>';
    })

    graphDiv.append("div")
      .attr("class", "note")
      .html(function(d){
        return '<span>Notes:</span> ' + d.notes;
      })

})
