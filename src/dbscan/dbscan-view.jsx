import React, { Component } from "react";
import { PropTypes } from "prop-types";
import DBSCAN from "./dbscan";
import * as d3 from "d3";
import "./dbscan-view.css";
import { generateClumps } from "../common";

const CLUSTER_DUR = 1000;
const BASE_COLOR = "#888";

export default class DbscanView extends Component {
    static propTypes = {
        epsilon: PropTypes.number,
        minPoints: PropTypes.number,
        width: PropTypes.number,
        height: PropTypes.number
    };

    static defaultProps = {
        width: 800,
        height: 600
    };

    state = {
        data: null,
        scales: null,
        extent: null,
        epsilon: 10,
        maxTestPoints: 100, // max test data points
        minPoints: 3,
        colors: d3.scaleOrdinal(d3.schemeCategory20)
    };

    generateData = () => {
        const clumpCount = 3;
        const { width, height } = this.props;
        const { maxTestPoints } = this.state;

        const data = generateClumps(clumpCount, Math.round(maxTestPoints / clumpCount), 15);

        const extent = this.getMax(data);
        const scales = this.getScales(extent, width, height);
        this.setState({ data, extent, scales });

        this.renderDataPoints(data, scales);
    };

    getMax = data => {
        return [d3.max(data, d => d[0]), d3.max(data, d => d[1])];
    };

    getScales = (extent, width, height) => {
        return {
            x: d3.scaleLinear().domain([0, extent[0]]).range([0, width]),
            y: d3.scaleLinear().domain([0, extent[1]]).range([0, height])
        };
    };

    renderDataPoints = (data, scales) => {
        data.forEach((d, i) => (d.id = i));

        d3.select(".data-plot-area").selectAll(".data-point").remove();

        d3.select(".epsilon-plot-area").selectAll(".epsilon").remove();

        d3
            .select(".data-plot-area")
            .selectAll(".data-points")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "data-point")
            .attr("cx", d => scales.x(d[0]))
            .attr("cy", d => scales.y(d[1]))
            .attr("r", 5)
            .style("fill", BASE_COLOR);
    };


    renderClusters = (animPoints, clusters, epsilon, scales) => {
        const { colors } = this.state;
        const eRadius = scales.x(epsilon);

        d3.select(".epsilon-plot-area").selectAll(".epsilon").remove();

        for (let c = 0, len = clusters.length; c < len; c++) {
            const cluster = clusters[c];
            const inc = CLUSTER_DUR / cluster.length;

            d3
                .select(".epsilon-plot-area")
                .selectAll(".epsilon cluster" + c)
                .data(cluster)
                .enter()
                .append("circle")
                .attr("class", "epsilon cluster" + c)
                .attr("cx", cpi => animPoints[cpi].x)
                .attr("cy", cpi => animPoints[cpi].y)
                .attr("r", 0)
                .style("visibility", "hidden")
                .style("fill", colors(c))
                .style("opacity", 0.25)
                .style("stroke", "none")

                // delay the start of subsequent transitions
                .transition()
                .delay((d, i) => {
                    const delay = c * CLUSTER_DUR + inc * i;
                    return delay;
                })
                .duration(1)

                // visible
                .transition()
                .duration(1)
                .style("visibility", "visible")

                // grow radius
                .transition()
                .duration(250)
                .attr("r", eRadius);

            d3
                .select(".epsilon-plot-area")
                .selectAll(".epsilon")
                .transition()
                .delay(clusters.length * 1000)
                .duration(1000)
                .style("opacity", 0);
        }
    };

    setPointColors = animPoints => {
        const { colors } = this.state;

        const update = d3.select(".data-plot-area").selectAll(".data-point");

        update
            .transition()
            .duration(1)
            .delay(d => {
                const d1 = animPoints[d.id];
                return d1.clusterId !== undefined
                    ? CLUSTER_DUR * (d1.clusterId + 1)
                    : 0;
            })
            .style("fill", d => {
                const d1 = animPoints[d.id];
                return d1.clusterId !== undefined
                    ? colors(d1.clusterId)
                    : BASE_COLOR;
            });
    };

    resetPointColors = animPoints => {
        d3
            .select(".data-plot-area")
            .selectAll(".data-points")
            .style("fill", BASE_COLOR);
    };

    /**
     * Helper array for animations
     */
    getAnimPoints = (data, clusters, scales) => {
        return data.map((d, i) => {
            let clusterId;
            for (let c = 0, len = clusters.length; c < len; c++) {
                const cluster = clusters[c];
                if (cluster.indexOf(i) !== -1) {
                    clusterId = c;
                    break;
                }
            }
            return { id: i, x: scales.x(d[0]), y: scales.y(d[1]), clusterId };
        });
    };

    start = () => {
        const { width, height } = this.props;
        const { data, epsilon, minPoints } = this.state;

        const extent = this.getMax(data);
        const scales = this.getScales(extent, width, height);

        const dbscan = new DBSCAN(data, epsilon, minPoints);
        const clusters = dbscan.run(data, epsilon, minPoints);

        const animPoints = this.getAnimPoints(data, clusters, scales);
        this.renderClusters(animPoints, clusters, epsilon, scales);

        this.setPointColors(animPoints);
    };

    onChangeEpsilon = e => {
        this.setState({ epsilon: e.target.value });
    };
    onChangeMaxTestPoints = e => {
        this.setState({ maxTestPoints: e.target.value });
    };

    render() {
        const { width, height } = this.props;
        const { epsilon, maxTestPoints } = this.state;

        return (
            <div className="dbscan dark-panel">
                <h1>DBSCAN</h1>
                <div className="acronym">
                    <strong>D</strong>ensity&nbsp;
                    <strong>B</strong>ased&nbsp;
                    <strong>S</strong>patial&nbsp;
                    <strong>C</strong>lustering
                    of&nbsp;
                    <strong>A</strong>pplications
                    with&nbsp;
                    <strong>N</strong>oise&nbsp;
                </div>

                <div className="centered-panel">
                    <p>
                        Find clusters one point at a time. Use "nearest neighbor" to find other points close to one point within a threshold (epsilon). For each found point do the same until no more close points are found. Then start another cluster and keep going until all points have been touched. Outliers are skipped as "noise". When this runs, each colored circle is a nearest neighbor boundary.
                    </p>


                    <svg width={width} height={height}>
                        <rect x1={0} y1={0} width={width} height={height} />
                        <g className="epsilon-plot-area" />
                        <g className="data-plot-area" />
                    </svg>

                    <div className="ui grid">
                        <div className="row">
                            <div className="eight wide column">
                                <h4>Max Points</h4>
                                <div className="ui left labeled input">
                                    <input
                                        type="number"
                                        value={maxTestPoints}
                                        onChange={this.onChangeMaxTestPoints}
                                    />
                                </div>
                                <br />
                                <br />
                                <button
                                    className="ui blue button"
                                    onClick={this.generateData}
                                >
                                    1. Generate data
                                </button>

                            </div>

                            <div className="eight wide column">
                                <h4>Epsilon</h4>
                                <div className="ui left labeled input">
                                    <input
                                        type="number"
                                        value={epsilon}
                                        onChange={this.onChangeEpsilon}
                                    />
                                </div>
                                <br />
                                <br />
                                <button
                                    className="ui orange button"
                                    onClick={this.start}
                                >
                                    2. Find Clusters
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
