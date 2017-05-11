import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import * as d3 from 'd3';
import './knn.css';
import { getExtents } from '../common';
import { TRAINING_DATA } from './training-data';

const DEMO_ANIM_TIME = 1000;

export default class Knn extends Component {
    static propTypes = {
        trainingData: PropTypes.object,
        k: PropTypes.number
    }

    static defaultProps = {
        trainingData: TRAINING_DATA,
        k: 3,
        width: 600,
        height: 600,
        pad: 30
    }

    state = {
        unknownNode: null
    }

    componentDidMount() {
        this.setupClick();
    }


    /**
     * Sets a point at the clicked coordinate
     */
    setupClick = () => {
        const self = this;

        d3.select('.click-area').on('click', function () {
            const coords = d3.mouse(this);
            const unknown = [
                coords[0],
                coords[1],
                null
            ]
            self.setState({ unknownNode: unknown });
            self.renderAnimatedMeasurementLines();
        });
    }


    /**
     * Get scales that translate data values to screen pixels
     */
    getScales = (extents, width, height) => {
        // Always two scales (x,y) since we can only plot 2 dimensional data,
        // even though the algorithm can support any number of dimensions!
        const scaleX = d3.scaleLinear()
            .domain([0, extents[0][1]])
            .range([0, width]);

        const scaleY = d3.scaleLinear()
            .domain([0, extents[1][1]])
            .range([0, height]);

        return { x: scaleX, y: scaleY };
    }


    /**
     * Get distance from unknown node to every training node
     */
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
    }


    /**
     * Get top k guesses for the unknown node
     */
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
            return b.count - a.count
        });

        return guesses;
    }


    /**
     * Get index of category column.
     */
    getTypeColumnIndex = dimensions => {
        // Assumed to be the last column for now
        return dimensions ? dimensions.length - 1 : 0;
    }


    /**
     * Find all unique category types in the training data
     */
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
    }


    render() {
        const { trainingData, k, width, height, pad } = this.props;
        const { unknownNode } = this.state;


        // Training data contains two array --
        // #1 dimensions (dimension labels), #2 the training data values
        const { dimensions, data } = trainingData;

        const extents = getExtents(data);
        const innerWidth = width - (pad * 2);
        const innerHeight = height - (pad * 2);

        const scales = this.getScales(extents, innerWidth, innerHeight);

        // Color for each type
        const types = this.getUniqueTypes(trainingData);
        const typesLen = types.length;
        const color = d3.scaleOrdinal()
            .domain(types)
            .range(d3.schemeCategory10.filter((d, i) => i < typesLen));

        // Column index of type column (last)
        const typeCol = this.getTypeColumnIndex(dimensions);

        // guess type
        let guesses = [];
        let distances;
        let radius;
        let nodeDomainData;
        if (unknownNode) {
            // Scale-invert click coordinates to get the domain values of the unknown node
            nodeDomainData = [scales.x.invert(unknownNode[0]), scales.y.invert(unknownNode[1]), null];

            // Get distance from unknown node to every training node
            distances = this.measureDistancesFromUnknown(nodeDomainData, extents, trainingData.data);

            // Get a ranked list of guesses
            guesses = this.guessType(unknownNode, data, distances, typeCol, k);

            // Colculate radius of influence and animate it
            radius = distances[k - 1][0] * innerWidth;
            this.renderAnimatedRadius(unknownNode[0], unknownNode[1], radius);
        }

        return (
            <div className="knn" style={{ marginLeft: 20 }}>
                <h3 className="ui header">kNN</h3>

                {/*Render graph*/}
                <svg className="container" width={width} height={height}>

                    {/* Render axis labels */}
                    <text x={width / 2} y={height - 3} textAnchor="middle">{dimensions[0]}</text>
                    <g transform={`translate(10 ${height / 2})`}>
                        <text textAnchor="middle" transform="rotate(-90)">{dimensions[1]}</text>
                    </g>

                    <rect className="border" width={width} height={height} />
                    <g className="measurement-area" transform={`translate(${pad} ${pad})`}/>

                    <g className="plot-area" transform={`translate(${pad} ${pad})`}>
                        {/* Render a rect to capture mouse clicks */}
                        <rect className="click-area" width={innerWidth} height={innerHeight} style={{ opacity: 0 }} />

                        {
                            /* Render all training data points if we have scales and therefore data available */
                            scales.x &&
                                trainingData.data.map((d, i) => <circle key={i} cx={scales.x(d[0])} cy={scales.y(d[1])} r="5" style={{ fill: color(d[typeCol]) }} />)
                        }

                        {
                            /* Render the unknown node if it exists */
                            unknownNode &&
                                <g className="test-node">
                                    <circle cx={unknownNode[0]} cy={unknownNode[1]} r="7" style={{ fill: '#aaa' }} />
                                </g>
                        }
                    </g>
                </svg>

                {/* Render legend and guesses underneath graph */}
                {
                    nodeDomainData &&
                        <div>{`Unknown node: ${dimensions[0]}: ${nodeDomainData[0].toFixed(0)}, ${dimensions[1]}: ${nodeDomainData[1].toFixed(0)}`}</div>
                }

                <div className="ui grid result" style={{ width, marginTop: 30 }}>
                    <div className="row">
                        {/* Render legend */}
                        <div className="eight wide column">

                            <h4 className="ui header">Legend</h4>
                            {
                                types.map((d, i) =>
                                    <div key={i} className="legend">
                                        <div className="legend-box" style={{ backgroundColor: color(i) }} />
                                        <div className="legend-label">{d}</div>
                                    </div>
                                )
                            }
                        </div>

                        {/* Render list of guesses */}
                        <div className="eight wide column">

                            <h4 className="ui header">Guesses</h4>
                            {
                                guesses.map((d, i) =>
                                    <div key={i} className="legend">
                                        <div className="legend-box" style={{ backgroundColor: color(d.type) }} />
                                        <div className="legend-label">{d.type} (confidence: {(d.count * (100 / k )).toFixed(0)}%)</div>
                                    </div>
                                )
                            }
                        </div>
                    </div>
                </div>
            </div>
        );
    }


    renderAnimatedRadius(x, y, r) {
        d3.select('.test-node .roi')
            .remove();

        d3.select('.test-node').append('circle')
            .attr('class', 'roi')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 0)
            .style('fill', 'none')
            .style('stroke', '#555')
            .style('stroke-width', 1)
            .transition().delay(DEMO_ANIM_TIME)
                .attr('r', r);
    }


    renderAnimatedMeasurementLines = () => {
        const { trainingData: { data }, width, height, pad } = this.props;

        const extents = getExtents(data);
        const innerWidth = width - (pad * 2);
        const innerHeight = height - (pad * 2);
        const { x: scaleX, y: scaleY }  = this.getScales(extents, innerWidth, innerHeight);

        // Clicked point
        const p = this.state.unknownNode;
        const g = d3.select('g.measurement-area');

        // Determine animation increment
        const len = data.length;
        const inc = DEMO_ANIM_TIME / len;

        // Draw the measurement lines. All lines are actually rendered
        // simultaneously but with staggered animation delays
        data.forEach((d, i) => {
            const delay = i * inc;

            g.append('line')
                .attr('x1', p[0])
                .attr('y1', p[1])
                .attr('x2', scaleX(d[0]))
                .attr('y2', scaleY(d[1]))
                .style('visibility', 'hidden')
                .style('stroke', 'black')

                .transition().duration(1).delay(delay)
                    .style('visibility', 'visible')
                    .transition(1).delay(125)
                    .remove();
        });
    }
}