import { getStroke } from 'perfect-freehand';

export interface Point {
    x: number;
    y: number;
    pressure?: number;
}

// Function to convert point array to SVG path data using perfect-freehand
export const getSvgPathFromStroke = (stroke: number[][]): string => {
    if (!stroke.length) return "";

    const d = (stroke as any).reduce(
        (acc: any, [x0, y0]: any, i: any, arr: any) => {
            const [x1, y1] = arr[(i + 1) % arr.length];
            acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
            return acc;
        },
        ["M", ...stroke[0], "Q"]
    );

    d.push("Z");
    return d.join(" ");
};

// Main function to get the smooth path from input points
export const getFreehandPath = (points: Point[], options: any = {}): string => {
    if (points.length < 2) return '';

    // Convert our Point objects to [x, y, pressure] array expected by perfect-freehand
    const inputPoints = points.map(p => [p.x, p.y, p.pressure || 0.5]);

    const strokeOptions = {
        size: 8,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
        easing: (t: any) => t,
        start: {
            taper: 0,
            easing: (t: any) => t,
            cap: true
        },
        end: {
            taper: 0,
            easing: (t: any) => t,
            cap: true
        },
        ...options
    };

    const stroke = getStroke(inputPoints, strokeOptions);
    return getSvgPathFromStroke(stroke);
};

export const getPointsFromPath = (pathData: string): Point[] => {
    if (!pathData) return [];

    // Legacy/Simple parser for standard "M x y L x y" paths
    // Note: perfect-freehand output is closed shapes "M... Z", parsing that back to a centerline is hard.
    // This parser assumes input is a centerline (M L L L).
    const points: Point[] = [];
    const commands = pathData.split(/(?=[ML])/).filter(c => c.trim());
    commands.forEach(cmd => {
        const parts = cmd.trim().split(/\s+/);
        if (parts.length >= 3) {
            const x = parseFloat(parts[1]);
            const y = parseFloat(parts[2]);
            if (!isNaN(x) && !isNaN(y)) points.push({ x, y });
        }
    });

    return points;
};

// Wrapper compatible with legacy calls, effectively applying the "ink" effect to a simple line
export const smoothPath = (pathData: string, _iterations: number = 2): string => {
    const segments = pathData.split('M').filter(s => s.trim());
    if (segments.length === 0) return '';

    const smoothedSegments = segments.map(seg => {
        const fullSeg = seg.trim().startsWith('M') ? seg : `M ${seg}`;
        const points = getPointsFromPath(fullSeg);
        return getFreehandPath(points);
    });

    return smoothedSegments.join(' ');
};
