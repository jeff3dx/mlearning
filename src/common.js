import * as d3 from 'd3';

export function getExtents(data) {
    // Map each column to an extent of [min, max]
    // Ex. If there are 7 columns in the data, this will return
    // an array of 7 extents, each one an array of [min, max, diff]
    const extents = data[0].map((d, i) => {
        // Return a default extent if the data is not numeric
        if (isNaN(d)) {
            return [0, 0, 0];
        }

        const ext = d3.extent(data, d => d[i]);

        // Add on the difference max - min for convenience later
        ext.push(ext[1] - ext[0]);
        return ext;
    });
    return extents;
}

