import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import * as d3 from 'd3';
import './knn.css';

const TRAINING_DATA = {
    dimensions: [
        'rooms': 0,
        'area': 1,
        'type': 2
    ],
    data: [
        [1, 350, 'apartment'],
        [2, 300, 'apartment'],
        [3, 300, 'apartment'],
        [4, 250, 'apartment'],
        [4, 500, 'apartment'],
        [4, 400, 'apartment'],
        [5, 450, 'apartment'],
        [7, 850, 'house'],
        [7, 900, 'house'],
        [7, 1200, 'house'],
        [8, 1500, 'house'],
        [9, 1300, 'house'],
        [8, 1240, 'house'],
        [10, 1700, 'house'],
        [9, 1000, 'house'],
        [1, 800, 'flat'],
        [3, 900, 'flat'],
        [2, 700, 'flat'],
        [1, 900, 'flat'],
        [2, 1150, 'flat'],
        [1, 1000, 'flat'],
        [2, 1200, 'flat'],
        [1, 1300, 'flat']
    ]
}


export default class Knn extends Component {
    static propTypes = {
        trainingData: PropTypes.object
    }

    static defaultProps = {
        trainingData: TRAINING_DATA,
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
     * Setup D3 click handler which provides nice coordinate translation
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
        });
    }


    /**
     * Get data extents and scales
     */
    getScales = (extents, width, height) => {
        // D3 scales. Can only plot 2 dimensions so higher dimensions are ignored here.
        const scaleX = d3.scaleLinear()
            .domain([extents[0][0], extents[0][1]])
            .range([0, width]);

        const scaleY = d3.scaleLinear()
            .domain([extents[1][0], extents[1][1]])
            .range([0, height]);

        return { x: scaleX, y: scaleY };
    }


    /**
     * Get extent of each dimension [min, max, size]
     */
    getExtentsOfTrainingData = data => {
        const len = data[0].length;
        // Iterate columns, calculate extent and diff of each
        const extents = data[0]
            .filter((d, i) => i < len - 1)
            .map((d, i) => {
                const ext = [0, d3.max(data, d => d[i])];
                ext.push(ext[1] - ext[0]);
                return ext;
            });
        return extents;
    }


    /**
     * Get distance from every other node for one unknown node
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
        var types = {};

        // Tally type count of the top K training nodes
        for (let i = 0; i < k; i++) {
            var distanceData = distances[i];

            // Get data element referenced by distanceData, and get it's type
            var type = data[distanceData[1]][typeCol];

            if (!types[type]) {
                types[type] = 0;
            }

            types[type] += 1;
        }

        const guesses = Object.keys(types).map(type => ({ type: type, count: types[type] }));

        guesses.sort((a, b) => {
            return b.count - a.count
        });

        return guesses;
    }


    /**
     * Get index of category column. Assumed to be the last one for now.
     */
    getCategoryColumnIndex = dimensions => {
        return dimensions.length - 1;
    }


    /**
     * Find all unique category types in the training data
     */
    getUniqueTypes = trainingData => {
        const { trainingData: { data, dimensions } } = this.props;
        const typeCol = this.getCategoryColumnIndex(dimensions);

        const types = data.reduce((acc, d) => {
            acc[d[typeCol]] = true;
            return acc;
        }, {});

        return Object.keys(types);
    }


    render() {
        const k = 3;
        const { trainingData, width, height, pad } = this.props;
        const { unknownNode } = this.state;
        const { data, dimensions } = trainingData;

        const extents = this.getExtentsOfTrainingData(trainingData.data);
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
        const typeCol = this.getCategoryColumnIndex(dimensions);

        // guess type
        let guessedTypes = [];
        let distances;
        let radius;
        if (unknownNode) {
            const nodeDomainData = [scales.x.invert(unknownNode[0]), scales.y.invert(unknownNode[1]), null];

            distances = this.measureDistancesFromUnknown(nodeDomainData, extents, trainingData.data);

            guessedTypes = this.guessType(unknownNode, data, distances, typeCol, k);

            // radius of influence
            radius = distances[k - 1][0] * innerWidth;
            this.renderAnimatedRadius(unknownNode[0], unknownNode[1], radius);
        }


        return (
            <div className="knn" style={{ marginLeft: 20 }}>
                <h3 className="ui header">kNN</h3>

                <svg className="container" width={width} height={height}>
                    <text x={width / 2} y={height - 3} textAnchor="middle">{dimensions[0]}</text>

                    <g transform={`translate(10 ${height / 2})`}>
                        <text textAnchor="middle" transform="rotate(-90)">{dimensions[1]}</text>
                    </g>

                    <rect className="border" width={width} height={height} />

                    <g className="plot-area" transform={`translate(${pad} ${pad})`}>
                        <rect className="click-area" width={innerWidth} height={innerHeight} style={{ opacity: 0 }} />
                        {
                            scales.x &&
                            trainingData.data.map((d, i) => <circle key={i} cx={scales.x(d[0])} cy={scales.y(d[1])} r="5" style={{ fill: color(d[typeCol]) }} />)
                        }

                        {
                            unknownNode &&
                            <g className="test-node">
                                <circle cx={unknownNode[0]} cy={unknownNode[1]} r="5" style={{ fill: '#aaa' }} />
                            </g>
                        }
                    </g>
                </svg>

                <div className="ui grid result" style={{ width: '50%', marginTop: 30 }}>
                    <div className="row">
                        <div className="six wide column">

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

                        <div className="six wide column">

                            <h4 className="ui header">Guesses</h4>
                            {
                                guessedTypes.map((d, i) =>
                                    <div key={i} className="legend">
                                        <div className="legend-box" style={{ backgroundColor: color(d.type) }} />
                                        <div className="legend-label">{d.type} ({d.count})</div>
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
            .transition()
            .attr('r', r);
    }
}