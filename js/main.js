var nameNoSpaces = function(name) {
  return name.toLowerCase().split(" ").join("");
}

Promise.all([
  d3.json('data/donations.json')
]).then(function(data) {
  let donations = data[0];
  console.log(donations);

  const isMobile = $(window).width() < 770;

  const circleRadius = 2.5,
        labelYOffset = 10;

  let everyNLabels, nTicks;
  if (isMobile) {
    everyNLabels = 5;
    nTicks = 4;
  } else {
    everyNLabels = 7;
    nTicks = 5;
  }
  let indicatorPadding, chartPadding;

  let graphWidth;
  if (isMobile) {
    indicatorPadding = 10;
    chartPadding = 5;
    graphWidth = ($("#container").width() - 2 * indicatorPadding - 2 * chartPadding - 25);
  } else {
    indicatorPadding = 15;
    chartPadding = 15;
    graphWidth = ($("#container").width() - 2 * indicatorPadding - 4 * chartPadding - 40) / 2;
  }

  let margin;
  if (isMobile) {
    margin  = {top: 20, right: 30, bottom: 20, left: 50};
  } else {
    margin  = {top: 10, right: 30, bottom: 10, left: 50};
  }

  const width = graphWidth - margin.left - margin.right,
        height = isMobile ? graphWidth * 3 / 5 - margin.top - margin.bottom : graphWidth * 4.5 / 10 - margin.top - margin.bottom;

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
        .range([height, margin.top])
        .domain([0.95 * yExtent[0], 1.05 * yExtent[1]])
      d.line = line = d3.line()
        // .curve(d3.curveMonotoneX)
        .x(function(v){
          return d.xScale(d.parseDate(v.date))
        })
        .y(function(v){
          return d.yScale(v.value)
        })

      let every = Math.floor(d.data.values.length / everyNLabels) + 1;

      d.data.values.forEach(function(v, i){
        v.cx = d.xScale(d.parseDate(v.date));
        v.cy = d.yScale(v.value);
        v.label = v.value.toFixed(d.data.significant_figures) + d.data.unit;
        v.display = (i % every) == 0;
      });

      d.xAxis = d3.axisBottom()
          .tickFormat(function (t, i){
            if ((i % every) == 0) {
              return d3.timeFormat(d.data.date_format)(t);
            } else {
              return '';
            }
          })
          .tickValues(d.data.values.map(v => d.parseDate(v.date)))
          .scale(d.xScale);
      d.yAxis = d3.axisLeft()
          .tickFormat(t => t + d.data.unit)
          .ticks(Math.max(nTicks, d.data.values.length / 2))
          .scale(d.yScale);
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
      let lastNumberLabel, lastNumberPrefix, lastDateLabel, lastChangeLabel, lastChangeClass;
      let thisData = d.measures[0].data.values;
      let lastNumberSufix = ' ' + d.measures[0].data.trend_label;
      let lastNumber = thisData[thisData.length - 1].value;

      if (d.measures[0].data.unit_string.endsWith('($)')) {
        lastNumberPrefix = '$';
      } else {
        lastNumberPrefix = '';
      }
      if (d.measures[0].data.unit == 'K') {
        lastNumberLabel = lastNumberPrefix + lastNumber * 1000 + lastNumberSufix;
      } else {
        lastNumberLabel = lastNumberPrefix + lastNumber.toFixed(d.measures[0].data.significant_figures) + lastNumberSufix;
      }
      let lastDate = thisData[thisData.length - 1].date;
      lastDateLabel = d.measures[0].parseDate(lastDate).getFullYear() + '';
      let lastChange = NaN;
      if (thisData.length > 1) {
        secondToLastNumber = thisData[thisData.length - 2].value;
        lastChange = +((lastNumber - secondToLastNumber) / secondToLastNumber * 100).toFixed(1);
      }

      if (isNaN(lastChange)) {
        lastChangeLabel = '';
        lastChangeClass = 'empty';
      } else if (lastChange === 0){
        lastChangeLabel = lastChange + "%";
        lastChangeClass = 'neutral';
      } else if (lastChange < 0){
        lastChangeLabel = -lastChange + "%";
        lastChangeClass = 'negative';
      } else {
        lastChangeLabel = lastChange + "%";
        lastChangeClass = 'positive';
      }

      return '<span class="summary-name">' + d.name + '</span>' +
            '<span class="summary-measures">' + d.measures.length + " " + textMeasures + '</span>' +
            '<div class="trends">' +
            '<div class="last-value">' + lastNumberLabel + '</div>' +
            '<div class="last-date">' + lastDateLabel + '</div>' +
            '<div class="change ' + lastChangeClass + '">' + lastChangeLabel + '</div>' +
            '</div>';
    })
    .on("click", function(event, d){
      let summary = d3.select(this);
      summary.classed("checked", !summary.classed("checked"))

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
        if (index % 2 === 0) {
          result.push(array.slice(index, index + 2));
        }
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
    .attr("class", "y-axis")
    .attr("transform", "translate(0,0)")
    .each(function(d, i){
      let thisG = d3.select(this);
      thisG.call(d.yAxis);
      thisG.selectAll(".tick line")
        .attr("x2", width);
      thisG.selectAll(".domain").remove();
      thisG.selectAll("text")
        // .attr("dy", -5)
        // .attr("x", 2*margin.left);
    });

  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", "translate(0," + height + ")")
    .each(function(d, i){
      d3.select(this).call(d.xAxis);
    });

  // g.selectAll(".tick line")
  //   .remove()

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

  // g.selectAll(".label")
  //   .data(function(d){
  //     return d.data.values;
  //   })
  //   .join("text")
  //     .attr("class", "label")
  //     .style("opacity", function(d){
  //       if (d.display) {
  //         return 1;
  //       } else {
  //         return 0;
  //       }
  //     })
  //     .style("text-align", "middle")
  //     .text(function(d){
  //       return d.label;
  //     })
  //     .attr("x", function(d){
  //       let rect = d3.select(this).node().getBoundingClientRect();
  //       return d.cx - rect.width / 2;
  //     })
  //     .attr("y", function(d){
  //       return d.cy - labelYOffset;
  //     })

  graphDiv.append("div")
    .attr("class", "source")
    .html(function(d){
      let sourceHtml = "Source: ";
      let nSources = d.sources.length;
      if (nSources === 1) {
        sourceHtml += '<a href="' + d.sources[0].source_url + '" target="_blank">' + d.sources[0].source + '</a>'
      } else if (nSources == 2) {
        d.sources.forEach(function(s, i){
          sourceHtml += '<a href="' + s.source_url + '" target="_blank">' + s.source + '</a>'
          if (i === 0) {
            sourceHtml += " and "
          }
        })
      } else {
        d.sources.forEach(function(s, i){
          sourceHtml += '<a href="' + s.source_url + '" target="_blank">' + s.source + '</a>'
          if (i === d.sources.length - 2) {
            sourceHtml += ", and "
          } else if (i < d.sources.length - 2) {
            sourceHtml += ", "
          }
        })
      }
      return sourceHtml;
    })

    graphDiv.append("div")
      .attr("class", "note")
      .html(function(d){
        return '<span>Notes:</span> ' + d.notes;
      })

})
