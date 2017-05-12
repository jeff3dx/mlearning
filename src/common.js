import * as d3 from 'd3';


export function getExtent(data) {
    // Map each column to its extents [min, max, diff].
    // Ex. If there are 7 columns in the data, this will return
    // an array of 7 extents, each one an array of [min, max, diff].
    const extents = data[0].map((d, i) => {
        // Return a default extent if the data is not numeric
        if (isNaN(d)) {
            return [0, 0, 0];
        }

        // use D3 extent https://github.com/d3/d3/blob/master/API.md#arrays-d3-array
        const ext = d3.extent(data, d => d[i]);

        // Add on the difference max - min for convenience later
        ext.push(ext[1] - ext[0]);
        return ext;
    });
    return extents;
}


export function getMean(data) {
    // Map each column to a mean value.
    // Ex. If there are 7 columns in the data, this will return
    // an array of 7 mean values.
    const means = data[0].map((d, i) => {
        // Return a default value if the data is not numeric
        if (isNaN(d)) {
            return 0;
        }

        // Use D3 mean https://github.com/d3/d3/blob/master/API.md#arrays-d3-array
        const mean = d3.mean(data, d => d[i]);

        return mean;
    });

    return means;
}
