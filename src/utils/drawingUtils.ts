
export function smoothPoints(points: {x: number, y: number}[], level: number): {x: number, y: number}[] {
    if (level === 0 || points.length < 3) return points;

    const windowSize = Math.max(1, Math.floor(level / 4));
    const iterations = Math.max(1, Math.floor(level / 5));

    let currentPoints = [...points];

    for (let iter = 0; iter < iterations; iter++) {
        const nextPoints: {x: number, y: number}[] = [];
        nextPoints.push(currentPoints[0]);

        for (let i = 1; i < currentPoints.length - 1; i++) {
            let sumX = 0, sumY = 0, count = 0;
            for (let j = -windowSize; j <= windowSize; j++) {
                if (i + j >= 0 && i + j < currentPoints.length) {
                    sumX += currentPoints[i + j].x;
                    sumY += currentPoints[i + j].y;
                    count++;
                }
            }
            nextPoints.push({ x: sumX / count, y: sumY / count });
        }
        nextPoints.push(currentPoints[currentPoints.length - 1]);
        currentPoints = nextPoints;
    }
    return currentPoints;
}

/**
 * Converts a sequence of points to an SVG path using Quadratic Bezier curves for smoothing.
 */
export function pointsToPath(points: {x: number, y: number}[]): string {
    if (points.length < 2) return '';
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

    let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    for (let i = 1; i < points.length - 2; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        path += ` Q ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}, ${xc.toFixed(2)} ${yc.toFixed(2)}`;
    }

    // For the last two points
    const last = points.length - 1;
    path += ` Q ${points[last - 1].x.toFixed(2)} ${points[last - 1].y.toFixed(2)}, ${points[last].x.toFixed(2)} ${points[last].y.toFixed(2)}`;

    return path;
}

export function simplifyPath(points: {x: number, y: number}[], tolerance: number): {x: number, y: number}[] {
    if (points.length <= 2) return points;

    const sqTolerance = tolerance * tolerance;

    function getSqDist(p1: {x: number, y: number}, p2: {x: number, y: number}) {
        const dx = p1.x - p2.x, dy = p1.y - p2.y;
        return dx * dx + dy * dy;
    }

    function getSqSegDist(p: {x: number, y: number}, p1: {x: number, y: number}, p2: {x: number, y: number}) {
        let x = p1.x, y = p1.y, dx = p2.x - x, dy = p2.y - y;
        if (dx !== 0 || dy !== 0) {
            let t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
            if (t > 1) { x = p2.x; y = p2.y; }
            else if (t > 0) { x += dx * t; y += dy * t; }
        }
        dx = p.x - x; dy = p.y - y;
        return dx * dx + dy * dy;
    }

    function simplifyDPStep(points: {x: number, y: number}[], first: number, last: number, sqTolerance: number, simplified: {x: number, y: number}[]) {
        let maxSqDist = sqTolerance, index = -1;
        for (let i = first + 1; i < last; i++) {
            let sqDist = getSqSegDist(points[i], points[first], points[last]);
            if (sqDist > maxSqDist) { index = i; maxSqDist = sqDist; }
        }
        if (index !== -1) {
            if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
            simplified.push(points[index]);
            if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
        }
    }

    const simplified = [points[0]];
    simplifyDPStep(points, 0, points.length - 1, sqTolerance, simplified);
    simplified.push(points[points.length - 1]);

    return simplified;
}

/**
 * Converts a simple polyline path to a Bezier-curved path for smoother output.
 * Uses the Catmull-Rom to Cubic Bezier conversion.
 */
export function polylineToBezier(points: {x: number, y: number}[]): string {
    if (points.length < 2) return pointsToPath(points);
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;

        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }

    return d;
}
