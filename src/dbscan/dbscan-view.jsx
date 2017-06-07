import React, { Component } from "react";
import { PropTypes } from "prop-types";
import DBSCAN from "./dbscan";
import * as d3 from "d3";
import "./dbscan-view.css";

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

const POINTS_DUR = 1000;
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
        epsilon: 15,
        maxTestPoints: 50, // max test data points
        minPoints: 3,
        colors: d3.scaleOrdinal(d3.schemeCategory20)
    };

    generateData = () => {
        const { width, height } = this.props;
        const { maxTestPoints } = this.state;

        const size = random(Math.floor(maxTestPoints / 2), maxTestPoints);
        const data = new Array(size);

        for (let i = 0; i < size; i++) {
            data[i] = [random(0, 100), random(0, 100)];
        }

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
        const inc = POINTS_DUR / data.length;
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
            .style("visibility", "hidden")
            .style("fill", BASE_COLOR)
            // Wait then make visible
            .transition()
            .delay((d, i) => i * inc)
            .duration(1)
            .style("visibility", "visible");
    };

    /*
        clusters = [
            [ pointId's... ]
        ]

        CLUSTER_DUR
        POINTS_DUR
    */
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
        const { epsilon, maxTestPoints, minPoints } = this.state;

        return (
            <div className="dbscan">
                <h1>DBSCAN</h1>
                <h4>
                    (Density-Based Spatial Clustering of Applications with Noise)
                </h4>

                <div className="centered-panel">
                    <svg width={width} height={height}>
                        <rect x1={0} y1={0} width={width} height={height}/>
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
                                <br/>
                                <br/>
                                <button
                                    className="ui blue button"
                                    onClick={this.generateData}
                                >
                                    Generate data
                                </button>

                            </div>

                            <div className="eight wide column">
                                <h4>Min Points Per Cluster</h4>
                                <div className="ui left labeled input">
                                    <input
                                        type="number"
                                        value={minPoints}
                                        onChange={this.onChangeMinPoints}
                                    />
                                </div>
                                <br/>
                                <h4>Epsilon</h4>
                                <div className="ui left labeled input">
                                    <input
                                        type="number"
                                        value={epsilon}
                                        onChange={this.onChangeEpsilon}
                                    />
                                </div>
                                <br/>
                                <br/>
                                <button
                                    className="ui orange button"
                                    onClick={this.start}
                                >
                                    Start
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
