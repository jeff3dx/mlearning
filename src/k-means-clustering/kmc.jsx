import React, { Component } from "react";
import { PropTypes } from "prop-types";
import * as d3 from "d3";
import "./kmc.css";
import { getExtent } from "../common";
import { TRAINING_DATA } from "./training-data";

const MIN_COLUMN = 0;
const MAX_COLUMN = 1;
const RANGE_COLUMN = 2;

const MEANS_ANIM_DURATION = 1000;
const ITERATION_DELAY = 2000;

const MARGIN = 20;

/*
    Algorithm:

    1. Plot data points
    2. Create "k" additional points, placing them randomly on your graph. These points are the "cluster centroids" -- or the candidates for the centers of your clusters.

    Repeat the following:
    1. Assign each data point to the closest of the "k" clusterer centroids. Some points may change the centroid to which they belong.
    2. Move the centroid to the average position of all the data points that belong to it
    3. If any of the centroids moved in the last step, repeat. If nothing moved, were done. Currently point assignments are the clusters
*/

export default class Knn extends Component {
    static propTypes = {
        trainingData: PropTypes.array
    };

    static defaultProps = {
        trainingData: TRAINING_DATA,
        width: 600,
        height: 600,
        pad: 30
    };

    state = {
        means: null,
        k: 3
    };

    generateRandomTargetData() {
        const count = Math.floor(Math.random() * 30);
        const data = [];

        for (let i = 0; i < count; i++) {
            data.push([Math.random() * 10, Math.random() * 10]);
        }
        return data;
    }

    /* Create D3 scales for all rendering to follow */
    getScales = (extents, width, height) => {
        // Always two scales (x,y) since we can only plot 2 dimensional data,
        // even though the algorithm can support any number of dimensions!
        const scaleX = d3
            .scaleLinear()
            .domain([0, extents[0][MAX_COLUMN]])
            .range([0, width]);

        const scaleY = d3
            .scaleLinear()
            .domain([0, extents[1][MAX_COLUMN]])
            .range([0, height]);

        return { x: scaleX, y: scaleY };
    };

    /* Create k random points */
    initMeans = (k, extents) => {
        const means = [];

        while (k--) {
            var mean = [];

            for (let dimensionIndex in extents) {
                mean[dimensionIndex] =
                    extents[dimensionIndex][MIN_COLUMN] +
                    Math.random() * extents[dimensionIndex][RANGE_COLUMN];
            }
            means.push(mean);
        }

        return means;
    };

    /* Assign each training data point to its closest mean point (nearest neighbor) */
    makeAssignments(data, means) {
        const assignments = [];

        // Iterate data points
        for (let dataIndex in data) {
            const dataPoint = data[dataIndex];
            const distances = [];

            // Iterate means points
            for (let meanIndex in means) {
                const meanPoint = means[meanIndex];
                let sum = 0;

                // Measure distance of eacg meanPoint to the dataPoint
                for (let dimensionIndex in dataPoint) {
                    let difference =
                        dataPoint[dimensionIndex] - meanPoint[dimensionIndex];
                    difference *= difference;
                    sum += difference;
                }
                distances[meanIndex] = Math.sqrt(sum);
            }

            // Assign dataPoint to index of mean with shortest distance
            assignments[dataIndex] = distances.indexOf(
                Math.min.apply(null, distances)
            );
        }

        // Each dataPoint's closest meanPoint
        return assignments;
    }

    /* D3 animate the mean points */
    renderMeans = (means, scales, iteration) => {
        const update = d3
            .select(".means-plot-area")
            .selectAll(".mean-point")
            .data(means);

        // add new
        update
            .enter()
            .append("circle")
            .attr("class", "mean-point")
            .attr("cx", d => scales.x(d[0]))
            .attr("cy", d => scales.y(d[1]))
            .attr("r", 5);

        // animate move existing
        update
            .transition()
            .duration(MEANS_ANIM_DURATION)
            .delay(ITERATION_DELAY * iteration)
            .attr("cx", d => scales.x(d[0]))
            .attr("cy", d => scales.y(d[1]));
    };

    /* Delete all previous assignment lines */
    removeAssignmentLines() {
        d3
            .select(".assignments-plot-area")
            .selectAll(".assignment-line")
            .remove();
        d3.select(".means-plot-area").selectAll(".mean-point").remove();
    }

    /* D3 render a line connecting each training point to its assigned mean point */
    renderAssignmentLines = (
        assignments,
        trainingData,
        means,
        iteration,
        retain
    ) => {
        const { scales } = this.state;

        // Iteration must be added to the class name since all lines are drawn at the
        // same time. Only the the delay is increases for each iteration.
        const update = d3
            .select(".assignments-plot-area")
            .selectAll(".assignment-line i" + iteration)
            .data(assignments);

        // line from mean point to training data point
        update
            .enter()
            .append("line")
            .attr("class", "assignment-line i" + iteration)
            .attr("x1", a => scales.x(means[a][0]))
            .attr("y1", a => scales.y(means[a][1]))
            .attr("x2", (a, i) => scales.x(trainingData[i][0]))
            .attr("y2", (a, i) => scales.y(trainingData[i][1]))
            .style("visibility", "hidden")
            .transition()
            .duration(1)
            .delay(ITERATION_DELAY * iteration + MEANS_ANIM_DURATION)
            .style("visibility", "visible")
            .transition()
            .duration(1)
            .delay(500)
            .filter(() => !retain)
            .remove();
    };

    /* For each mean point, calculate the centeroid of its current cluster, then move the mean point to that centeroid */
    moveMeans(means, assignments, data, extents) {
        const sums = new Array(means.length);
        const counts = new Array(means.length);
        let moved = false;

        for (let j in means) {
            counts[j] = 0;
            sums[j] = Array(means[j].length);
            for (let dimension in means[j]) {
                sums[j][dimension] = 0;
            }
        }

        for (let pointIndex in assignments) {
            const meanIndex = assignments[pointIndex];
            const point = data[pointIndex];
            const mean = means[meanIndex];

            counts[meanIndex]++;

            for (let dimensionIndex in mean) {
                sums[meanIndex][dimensionIndex] += point[dimensionIndex];
            }
        }

        for (let meanIndex in sums) {
            console.log(counts[meanIndex]);
            if (0 === counts[meanIndex]) {
                sums[meanIndex] = means[meanIndex];
                console.log("Mean with no points");
                console.log(sums[meanIndex]);

                for (let dimensionIndex in extents) {
                    sums[meanIndex][dimensionIndex] =
                        extents[dimensionIndex][MIN_COLUMN] +
                        Math.random() * extents[dimensionIndex][RANGE_COLUMN];
                }
                continue;
            }

            for (let dimensionIndex in sums[meanIndex]) {
                sums[meanIndex][dimensionIndex] /= counts[meanIndex];
            }
        }

        if (means.toString() !== sums.toString()) {
            moved = true;
        }

        return { nextMeans: sums, moved };
    }

    // STEP 1 - Plot data points
    stepPlotTraining = () => {
        const { width, height, pad } = this.props;
        const innerWidth = width - pad * 2;
        const innerHeight = height - pad * 2;

        const data = this.generateRandomTargetData();

        const extents = getExtent(data);
        const scales = this.getScales(extents, innerWidth, innerHeight);

        this.removeAssignmentLines();

        this.setState({
            trainingData: data,
            extents,
            scales
        });
    };

    // STEP 2 - Draw random mean points
    stepGenerateMeans = () => {
        const { extents, scales, k } = this.state;
        const means = this.initMeans(k, extents);

        this.removeAssignmentLines();

        this.setState({ means }, () => {
            this.renderMeans(means, scales, 0);
        });
    };

    // STEP 3 - Iterate the clusting algorithm until mean points settle into position
    stepFindCentroids = () => {
        let { trainingData, means, scales, extents } = this.state;

        let moveResult = {};
        let assignments;

        // Loop until mean points stop moving
        // (don't hang the browser -- 100 max interations)
        for (let iteration = 0; iteration < 100; iteration++) {
            assignments = this.makeAssignments(trainingData, means);
            moveResult = this.moveMeans(
                means,
                assignments,
                trainingData,
                extents
            );

            if (moveResult.moved) {
                means = moveResult.nextMeans;
                this.renderMeans(means, scales, iteration);
                this.renderAssignmentLines(
                    assignments,
                    trainingData,
                    means,
                    iteration,
                    false
                );
            } else {
                this.renderAssignmentLines(
                    assignments,
                    trainingData,
                    means,
                    iteration,
                    true
                );
                break;
            }
        }
    };

    handleKChange = e => {
      this.setState({ k: e.target.value });
    }

    render() {
        const { trainingData, scales } = this.state;
        const { width, height, pad } = this.props;

        return (
            <div className="kmc" style={{ paddingLeft: MARGIN, backgroundColor: "#333", width: width + (MARGIN * 2) }}>
                <h3 className="ui header">k Means Clustering</h3>

                {/* Render graph */}
                <svg className="container" width={width} height={height}>

                    <rect className="border" width={width} height={height} />
                    <g
                        className="measurement-area"
                        transform={`translate(${pad} ${pad})`}
                    />

                    <g
                        className="assignments-plot-area"
                        transform={`translate(${pad} ${pad})`}
                    />

                    {/* Render all training data points */}
                    <g
                        className="plot-area"
                        transform={`translate(${pad} ${pad})`}
                    >
                        {scales &&
                            trainingData.map((d, i) => (
                                <circle
                                    className="training-point"
                                    key={i}
                                    cx={scales.x(d[0])}
                                    cy={scales.y(d[1])}
                                    r="5"
                                    style={{ fill: "#55f" }}
                                />
                            ))}
                    </g>

                    <g
                        className="means-plot-area"
                        transform={`translate(${pad} ${pad})`}
                    />

                </svg>

                <br />

                <div>
                    <button
                        className="ui button"
                        onClick={this.stepPlotTraining}
                        style={{ width: 220, textAlign: "left" }}
                    >
                        1. Plot random data
                    </button>
                </div>
                <br />
                <div className="ui left labeled input">
                  <label className="ui label">k =</label>
                  <input value={this.state.k} onChange={this.handleKChange}/>
                </div>
                <div>
                    <button
                        className="ui button"
                        onClick={this.stepGenerateMeans}
                        style={{ width: 220, textAlign: "left" }}
                    >
                        2. Plot random mean points
                    </button>
                </div>
                <br />
                <div>
                    <button
                        className="ui button"
                        onClick={this.stepFindCentroids}
                        style={{ width: 220, textAlign: "left" }}
                    >
                        3. Iterate centeroids
                    </button>
                </div>

            </div>
        );
    }
}
