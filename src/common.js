import * as d3 from "d3";

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

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

        // Append the difference (range), max minus min for convenience later
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

export function generateClumps(clumpCount, size, radius) {
    clumpCount = clumpCount || 3;
    size = size || 25;
    radius = radius || 15;
    const data = [];

    for (let i = 0; i < clumpCount; i++) {
        const center = [random(radius, 100 - radius), random(radius, 100 - radius)];

        const pointCount = random(Math.round(size / 2), size);

        for (let j = 0; j < pointCount; j++) {
            const translate = [
                random(-radius, radius),
                random(-radius, radius)
            ];
            const x = center[0] + translate[0];
            const y = center[1] + translate[1];
            if (x > 0 && x < 101 && y > 0 && y < 101) {
                data.push([x, y]);
            }
        }
    }

    return data;
}
