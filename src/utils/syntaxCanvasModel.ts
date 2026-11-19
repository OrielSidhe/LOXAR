import type { NodeType, SyntaxConnection, SyntaxNode } from '../types';

export type { NodeType, SyntaxConnection, SyntaxNode } from '../types';

/** Bounding box of a rendered node, already mapped to canvas coordinate space. */
export interface NodeBounds {
    x: number;
    y: number;
    w: number;
    h: number;
}

export type NodeBoundsMap = Record<string, NodeBounds>;

/** Cubic bezier segment between the centers of two node boxes. */
export interface ConnectionPath {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    midX: number;
    midY: number;
    d: string;
}

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.2;
export const ZOOM_WHEEL_IN = 1.1;
export const ZOOM_WHEEL_OUT = 0.9;

/** Default payload for a child node created from the "Dimensions / Children" button. */
export const DEFAULT_CHILD_NODE: Omit<SyntaxNode, 'id'> = {
    type: 'word',
    role: '...',
    label: 'Nuevo',
    color: '#888888',
    x: 0,
    y: 0,
    children: [],
};

/** Collision-free-enough id for canvas entities (timestamp + random suffix). */
export function uid(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Immutably patch the node with `id`, recursing into its children. */
export function updateNodeDeep(nodes: SyntaxNode[], id: string, patch: Partial<SyntaxNode>): SyntaxNode[] {
    return nodes.map(n => {
        if (n.id === id) return { ...n, ...patch };
        if (n.children && n.children.length > 0) {
            return { ...n, children: updateNodeDeep(n.children, id, patch) };
        }
        return n;
    });
}

/** Immutably remove the node with `id` (and its subtree) from every level. */
export function removeNodeDeep(nodes: SyntaxNode[], id: string): SyntaxNode[] {
    return nodes.filter(n => n.id !== id).map(n => ({
        ...n,
        children: n.children ? removeNodeDeep(n.children, id) : []
    }));
}

/** Immutably append `child` to the children of the node with `parentId`. */
export function addChildToNode(nodes: SyntaxNode[], parentId: string, child: SyntaxNode): SyntaxNode[] {
    return nodes.map(n => {
        if (n.id === parentId) return { ...n, children: [...(n.children || []), child] };
        if (n.children) return { ...n, children: addChildToNode(n.children, parentId, child) };
        return n;
    });
}

/** Depth-first lookup of a node by id. */
export function findNodeDeep(nodes: SyntaxNode[], id: string): SyntaxNode | null {
    for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children) {
            const found = findNodeDeep(n.children, id);
            if (found) return found;
        }
    }
    return null;
}

/** Flatten the tree depth-first (parents before their children). */
export function findAllNodes(nodes: SyntaxNode[]): SyntaxNode[] {
    let all: SyntaxNode[] = [];
    for (const n of nodes) {
        all.push(n);
        if (n.children) all = all.concat(findAllNodes(n.children));
    }
    return all;
}

/** Build a new node, filling id/children defaults so callers only pass domain fields. */
export function createNode(
    partial: Omit<SyntaxNode, 'id' | 'children'> & { children?: SyntaxNode[] }
): SyntaxNode {
    return { children: [], ...partial, id: uid() };
}

/** Default child node used by the "add child" affordance. */
export function createChildNode(): SyntaxNode {
    return createNode({ ...DEFAULT_CHILD_NODE });
}

/** New dependency/agreement/movement connection between two node ids. */
export function createConnection(
    fromId: string,
    toId: string,
    connectionType: SyntaxConnection['connectionType'] = 'dependency'
): SyntaxConnection {
    return { id: uid(), fromId, toId, connectionType };
}

/** Clamp a zoom factor to the supported range. */
export function clampZoom(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.min(Math.max(MIN_ZOOM, value), MAX_ZOOM);
}

/** Step zoom by a fixed amount (toolbar +/- buttons). */
export function zoomStep(current: number, direction: 'in' | 'out'): number {
    return clampZoom(direction === 'in' ? current + ZOOM_STEP : current - ZOOM_STEP);
}

/** Apply a wheel delta (ctrl/cmd + scroll) as a multiplicative zoom factor. */
export function zoomByWheel(current: number, deltaY: number): number {
    return clampZoom(current * (deltaY > 0 ? ZOOM_WHEEL_OUT : ZOOM_WHEEL_IN));
}

export interface ViewportOffset {
    left: number;
    top: number;
}

export interface CanvasCamera {
    pan: { x: number; y: number };
    zoom: number;
}

/** Map a client (screen) point into canvas coordinate space. */
export function toCanvasPoint(
    clientX: number,
    clientY: number,
    container: ViewportOffset,
    camera: CanvasCamera
): { x: number; y: number } {
    return {
        x: (clientX - container.left - camera.pan.x) / camera.zoom,
        y: (clientY - container.top - camera.pan.y) / camera.zoom,
    };
}

/** Map a DOM rect into canvas coordinate space and produce its bounds box. */
export function toNodeBounds(
    rect: { left: number; top: number; width: number; height: number },
    container: ViewportOffset,
    camera: CanvasCamera
): NodeBounds {
    return {
        x: (rect.left - container.left - camera.pan.x) / camera.zoom,
        y: (rect.top - container.top - camera.pan.y) / camera.zoom,
        w: rect.width / camera.zoom,
        h: rect.height / camera.zoom,
    };
}

/** Cubic bezier path between the centers of two node boxes, plus label anchor. */
export function buildConnectionPath(from: NodeBounds, to: NodeBounds): ConnectionPath {
    const startX = from.x + from.w / 2;
    const startY = from.y + from.h / 2;
    const endX = to.x + to.w / 2;
    const endY = to.y + to.h / 2;
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    return {
        startX,
        startY,
        endX,
        endY,
        midX,
        midY,
        d: `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`,
    };
}
