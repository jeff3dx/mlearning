import React, { Component } from "react";
import { PropTypes } from "prop-types";
import * as d3 from "d3";
import "./knn.css";
import { getExtent } from "../common";
import { TRAINING_DATA } from "./training-data";

const DEMO_ANIM_TIME = 1000;

/*
    The basic procedure of this class is as follows:

    1. Render underlying HTML structure and training data points. React does this rendering step.
    2. Wait for click
    3. Upon click calculate kNN and related data and save to state
    4. After state is saved and view updates, run animations with appropriate stagger delays. D3 renders this step directly to the DOM.
*/

export default class Knn extends Component {
    static propTypes = {
        trainingData: PropTypes.object,
        k: PropTypes.number
    };

    static defaultProps = {
        trainingData: TRAINING_DATA,
        k: 3,
        width: 600,
        height: 600,
        pad: 30
    };

    state = {
        color: null,
        distances: null,
        extents: null,
        guesses: null,
        innerHeight: null,
        innerWidth: null,
        roi: null,
        scales: null,
        typeCol: null,
        types: null,
        unknownNode: null
    };

    componentDidMount() {
        this.setupClick();
    }

    /* Get scales which translate data values to screen pixels */
    getScales = (extents, width, height) => {
        // Always two scales (x,y) since we can only plot 2 dimensional data,
        // even though the algorithm can support any number of dimensions!
        const scaleX = d3
            .scaleLinear()
            .domain([0, extents[0][1]])
            .range([0, width]);

        const scaleY = d3
            .scaleLinear()
            .domain([0, extents[1][1]])
            .range([0, height]);

        return { x: scaleX, y: scaleY };
    };

    /* Get distance from unknown node to every training node */
    measureDistancesFromUnknown = (node, extents, data) => {
        const distances = [];

        // Iterate dimensions (columns)
        for (let di = 0, dlen = data.length; di < dlen; di++) {
            const datum = data[di];

            // Get distance from unknown node to training node
            // Pythagorean Theorem works for any number of dimensions!
            const squares = [];

            // Subtract one to skip the "type" column
            for (let ci = 0, clen = datum.length; ci < clen - 1; ci++) {
                // Difference of training node value and unknown node value
                let delta = datum[ci] - node[ci];

                // Divide the difference by the size of this dimension's extent
                delta /= extents[ci][2]; // 2 = size column

                // Square the result for summing later
                squares.push(delta * delta);
            }

            // Length of vector from this node to training node. Complete's Pythagorean Theorem
            distances.push([Math.sqrt(d3.sum(squares)), di]);
        }

        distances.sort((a, b) => a[0] - b[0]);
        return distances;
    };

    /* Get top k guesses for the unknown node */
    guessType = (node, data, distances, typeCol, k) => {
        var typeTallies = {};

        // Tally type count of the top K training nodes
        for (let i = 0; i < k; i++) {
            var distanceData = distances[i];

            // Get data element referenced by distanceData, and get it's type.
            // distanceData includes a reference index into the trainingData
            var type = data[distanceData[1]][typeCol];

            if (!typeTallies[type]) {
                typeTallies[type] = 0;
            }

            typeTallies[type] += 1;
        }

        const guesses = Object.keys(typeTallies).map(type => {
            return { type: type, count: typeTallies[type] };
        });

        // Sort highest tally counts first
        guesses.sort((a, b) => {
            return b.count - a.count;
        });

        return guesses;
    };

    /* Get index of category column */
    getTypeColumnIndex = dimensions => {
        // Assumed to be the last column for now
        return dimensions ? dimensions.length - 1 : 0;
    };

    /* Find all unique category types in the training data */
    getUniqueTypes = trainingData => {
        if (!trainingData) {
            return [];
        }

        const { dimensions, data } = trainingData;
        const typeCol = this.getTypeColumnIndex(dimensions);

        const uniqueTypes = data.reduce((acc, d) => {
            acc[d[typeCol]] = true;
            return acc;
        }, {});

        return Object.keys(uniqueTypes);
    };

    /* Before rendering calculate scales for the plot area */
    componentWillMount() {
        // Calculate extents and scales and save in state
        const { trainingData, width, height, pad } = this.props;
        const { dimensions, data } = trainingData;

        const extents = getExtent(data);
        const innerWidth = width - pad * 2;
        const innerHeight = height - pad * 2;
        const scales = this.getScales(extents, innerWidth, innerHeight);

        // Get unique types in the data and assign a color to each
        const types = this.getUniqueTypes(trainingData);
        const typesLen = types.length;
        const color = d3
            .scaleOrdinal()
            .domain(types)
            .range(d3.schemeCategory10.filter((d, i) => i < typesLen));

        const typeCol = this.getTypeColumnIndex(dimensions);

        // Save state for rendering
        this.setState({
            extents,
            innerWidth,
            innerHeight,
            scales,
            types,
            color,
            typeCol
        });
    }

    /* Initialize the click handler */
    setupClick = () => {
        const self = this;
        d3.select(".click-area").on("click", function() {
            const coords = d3.mouse(this);
            self.onClick(coords[0], coords[1]);
        });
    };

    /* Upon click calculate guesses and related data and save to state */
    onClick = (dx, dy) => {
        const { trainingData, k } = this.props;

        const { extents, innerWidth, scales, typeCol } = this.state;

        // calculate kNN
        const unknownNode = [scales.x.invert(dx), scales.y.invert(dy), null];

        // Get distance from unknown node to every training node
        const distances = this.measureDistancesFromUnknown(
            unknownNode,
            extents,
            trainingData.data
        );

        // Run the algorithm to get a ranked list of guesses
        const guesses = this.guessType(
            unknownNode,
            trainingData.data,
            distances,
            typeCol,
            k
        );

        // Calculate radius of influence
        const roi = distances[k - 1][0] * innerWidth;

        this.setState({
            unknownNode,
            distances,
            guesses,
            roi
        });
    };

    /* Now that calculation data is saved to state render click feedback (click point, measurement lines, radius of influence) */
    componentDidUpdate() {
        this.renderUnknownNode();
        this.renderMeasurementLines();
        this.renderRadiusOfInfluence();
    }

    /* Render unknown node directly to the DOM with D3 */
    renderUnknownNode() {
        const { unknownNode, scales } = this.state;

        d3.select(".unknown-group .unknown-node").remove();

        d3
            .selectAll(".unknown-group")
            .append("circle")
            .attr("class", "unknown-node")
            .attr("cx", scales.x(unknownNode[0]))
            .attr("cy", scales.y(unknownNode[1]))
            .attr("r", 7)
            .style("fill", "#aaa");
    }

    /* Render measurement lines directly to the DOM with D3 */
    renderMeasurementLines = () => {
        const { trainingData: { data } } = this.props;
        const { scales, unknownNode } = this.state;

        // Determine animation increment
        const len = data.length;
        const inc = DEMO_ANIM_TIME / len;

        // D3 data bind
        const update = d3
            .select("g.measurement-lines")
            .selectAll(".measurement-line")
            .data(data);

        // Draw each line invisible
        update
            .enter()
            .append("line")
            .attr("class", "measurement-line")
            .attr("x1", scales.x(unknownNode[0]))
            .attr("y1", scales.y(unknownNode[1]))
            .attr("x2", d => scales.x(d[0]))
            .attr("y2", d => scales.y(d[1]))
            .style("visibility", "hidden")
            .style("stroke", "black")
            // Reveal each line with a staggered delay
            .transition()
            .duration(1)
            .delay((d, i) => i * inc)
            .style("visibility", "visible")
            // After a short delay delete the line
            .transition(1)
            .delay(125)
            .remove();
    };

    /* Render radius of influence directly to the DOM with D3 */
    renderRadiusOfInfluence = () => {
        const { unknownNode, scales, roi } = this.state;

        d3.select(".unknown-group .radius-of-influence").remove();

        d3
            .select(".unknown-group")
            .append("circle")
            .attr("class", "radius-of-influence")
            .attr("cx", scales.x(unknownNode[0]))
            .attr("cy", scales.y(unknownNode[1]))
            .attr("r", 0)
            .style('fill', "none")
            .style('stroke', "#000")
            // Animate size
            .transition()
            .delay(DEMO_ANIM_TIME)
            .duration(500)
            .attr("r", roi);
    };

    /* React render hook renders the underlying HTML structure whenever state changes.
       We render click feedback and results with the D3 functions above */
    render() {
        const { trainingData, k, width, height, pad } = this.props;
        const { dimensions } = trainingData;

        const {
            unknownNode,
            scales,
            typeCol,
            color,
            types,
            guesses
        } = this.state;

        return (
            <div className="knn" style={{ marginLeft: 20 }}>
                <h3 className="ui header">kNN</h3>

                <svg className="container" width={width} height={height}>
                    {/* Render axis labels */}
                    <text x={width / 2} y={height - 3} textAnchor="middle">
                        {dimensions[0]}
                    </text>
                    <g transform={`translate(10 ${height / 2})`}>
                        <text textAnchor="middle" transform="rotate(-90)">
                            {dimensions[1]}
                        </text>
                    </g>

                    <rect className="border" width={width} height={height} />
                    <g
                        className="measurement-area"
                        transform={`translate(${pad} ${pad})`}
                    />

                    <g
                        className="plot-area"
                        transform={`translate(${pad} ${pad})`}
                    >
                        {/* Rectangle to capture mouse clicks */}
                        <rect
                            className="click-area"
                            width={innerWidth}
                            height={innerHeight}
                            style={{ opacity: 0 }}
                        />

                        {/* Render all training points */
                        scales.x &&
                            trainingData.data.map((d, i) => (
                                <circle
                                    key={i}
                                    cx={scales.x(d[0])}
                                    cy={scales.y(d[1])}
                                    r="5"
                                    style={{ fill: color(d[typeCol]) }}
                                />
                            ))}

                        <g className="measurement-lines" />
                        <g className="unknown-group" />

                    </g>
                </svg>

                {/* Render legend and guesses underneath graph */}
                {unknownNode &&
                    <div
                    >{`Unknown node: ${dimensions[0]}: ${unknownNode[0].toFixed(0)}, ${dimensions[1]}: ${unknownNode[1].toFixed(0)}`}</div>}

                <div
                    className="ui grid result"
                    style={{ width, marginTop: 30 }}
                >
                    <div className="row">
                        {/* Render legend */}
                        <div className="eight wide column">

                            <h4 className="ui header">Legend</h4>
                            {types.map((d, i) => (
                                <div key={i} className="legend">
                                    <div
                                        className="legend-box"
                                        style={{ backgroundColor: color(i) }}
                                    />
                                    <div className="legend-label">{d}</div>
                                </div>
                            ))}
                        </div>

                        {/* Render list of guesses */
                        guesses &&
                            <div className="eight wide column">

                                <h4 className="ui header">Guesses</h4>
                                {guesses.map((d, i) => (
                                    <div key={i} className="legend">
                                        <div
                                            className="legend-box"
                                            style={{
                                                backgroundColor: color(d.type)
                                            }}
                                        />
                                        <div className="legend-label">
                                            {d.type}
                                            {" "}
                                            (confidence:
                                            {" "}
                                            {(d.count * (100 / k)).toFixed(0)}
                                            %)
                                        </div>
                                    </div>
                                ))}
                            </div>}

                    </div>
                </div>
            </div>
        );
    }
}
