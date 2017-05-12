import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import * as d3 from 'd3';
import './kmc.css';
import { getMean, getExtent } from '../common';
import { TRAINING_DATA } from './training-data';

export default class Knn extends Component {
    static propTypes = {
        trainingData: PropTypes.array,
    }

    static defaultProps = {
        trainingData: TRAINING_DATA,
        width: 600,
        height: 600,
        pad: 30
    }

    state = {
    }

    componentDidMount() {
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


    render() {
        const { width, height, pad, trainingData} = this.props;
        const innerWidth = width - (pad * 2);
        const innerHeight = height - (pad * 2);
        const extents = getExtent(trainingData);
        const scales = this.getScales(extents, innerWidth, innerHeight);

        return (
            <div className="knn" style={{ marginLeft: 20 }}>
                <h3 className="ui header">k-means</h3>

                {/*Render graph*/}
                <svg className="container" width={width} height={height}>

                    <rect className="border" width={width} height={height} />
                    <g className="measurement-area" transform={`translate(${pad} ${pad})`}/>

                    <g className="plot-area" transform={`translate(${pad} ${pad})`}>
                        {
                            /* Render all training data points if we have scales and therefore data available */
                            scales.x &&
                                trainingData.map((d, i) => <circle key={i} cx={scales.x(d[0])} cy={scales.y(d[1])} r="5" style={{ fill: '#55f' }} />)
                        }

                    </g>
                </svg>

            </div>
        );
    }
}