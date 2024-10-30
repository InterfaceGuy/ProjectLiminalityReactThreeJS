import React from 'react';
import * as d3 from 'd3';

const DreamContent = ({ data, onNodeInteraction }) => {
  const ref = React.useRef();

  React.useEffect(() => {
    // Clear previous content inside the ref
    while (ref.current && ref.current.firstChild) {
      ref.current.removeChild(ref.current.firstChild);
    }

    // Specify the chart's dimensions.
    const width = 928;
    const height = width;

    // Create the color scale.
    const color = d3.scaleLinear()
      .domain([0, 5])
      .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
      .interpolate(d3.interpolateHcl);

    // Compute the layout.
    const pack = (data) => d3.pack()
      .size([width, height])
      .padding(3)(
        d3.hierarchy(data)
          .sum((d) => d.value)
          .sort((a, b) => b.value - a.value)
      );

    const root = pack(data);

    // Create the SVG container and append it to the ref.
    const svg = d3.select(ref.current)
      .append("svg")
      .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
      .attr("width", width)
      .attr("height", height)
      .attr(
        "style",
        `max-width: 100%; height: auto; display: block; margin: 0 -14px; background: ${color(
          0
        )}; cursor: pointer;`
      );

    // Append the nodes.
    const node = svg
      .append("g")
      .selectAll("circle")
      .data(root.descendants().slice(1))
      .join("circle")
      .attr("fill", (d) => (d.children ? color(d.depth) : "white"))
      .attr("pointer-events", (d) => (!d.children ? "none" : null))
      .on("mouseover", function () {
        d3.select(this).attr("stroke", "#000");
        console.log("DreamContent: Node mouseover");
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", null);
        console.log("DreamContent: Node mouseout");
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        event.preventDefault();
        console.log("DreamContent: Node clicked", d.data);
        if (onNodeInteraction) {
          console.log("DreamContent: Calling onNodeInteraction");
          onNodeInteraction({
            type: "click",
            node: d.data,
            event: event,
          });
        } else {
          console.log("DreamContent: onNodeInteraction is not defined");
        }
        if (focus !== d) zoom(event, d);
      });

    // Add a click event listener to the entire SVG
    svg.on("click", (event) => {
      event.stopPropagation();
      console.log("DreamContent: SVG background clicked");
    });

    // Add a click event listener to the entire SVG
    svg.on("click", (event) => {
      console.log("DreamContent: SVG clicked");
      event.stopPropagation();
    });

    // Append the text labels.
    const label = svg
      .append("g")
      .style("font", "10px sans-serif")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .selectAll("text")
      .data(root.descendants())
      .join("text")
      .style("fill-opacity", (d) => (d.parent === root ? 1 : 0))
      .style("display", (d) => (d.parent === root ? "inline" : "none"))
      .text((d) => d.data.name);

    // Create the zoom behavior and set the initial focus.
    svg.on("click", (event) => zoom(event, root));
    let focus = root;
    let view;
    zoomTo([focus.x, focus.y, focus.r * 2]);

    // Zoom functions.
    function zoomTo(v) {
      const k = width / v[2];

      view = v;

      label.attr(
        "transform",
        (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`
      );
      node.attr(
        "transform",
        (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`
      );
      node.attr("r", (d) => d.r * k);
    }

    function zoom(event, d) {
      const focus0 = focus;

      focus = d;

      const transition = svg
        .transition()
        .duration(event.altKey ? 7500 : 750)
        .tween("zoom", () => {
          const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
          return (t) => zoomTo(i(t));
        });

      label
        .filter(function (d) {
          return d.parent === focus || this.style.display === "inline";
        })
        .transition(transition)
        .style("fill-opacity", (d) => (d.parent === focus ? 1 : 0))
        .on("start", function (d) {
          if (d.parent === focus) this.style.display = "inline";
        })
        .on("end", function (d) {
          if (d.parent !== focus) this.style.display = "none";
        });
    }
  }, [data, onNodeInteraction]);

  return <div ref={ref} />;
};

export default DreamContent;
