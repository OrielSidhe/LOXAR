import { describe, it, expect } from 'vitest';
import {
    addChildToNode,
    buildConnectionPath,
    clampZoom,
    createChildNode,
    createConnection,
    createNode,
    findAllNodes,
    findNodeDeep,
    removeNodeDeep,
    toCanvasPoint,
    toNodeBounds,
    uid,
    updateNodeDeep,
    zoomByWheel,
    zoomStep,
    DEFAULT_CHILD_NODE,
    MAX_ZOOM,
    MIN_ZOOM,
} from '../syntaxCanvasModel';
import type { NodeBounds, SyntaxConnection, SyntaxNode } from '../syntaxCanvasModel';

const node = (id: string, overrides: Partial<SyntaxNode> = {}): SyntaxNode => ({
    id,
    type: 'word',
    role: 'subject',
    label: id,
    x: 0,
    y: 0,
    color: '#fff',
    children: [],
    ...overrides,
});

const tree = (): SyntaxNode[] => [
    node('root', {
        type: 'clause',
        children: [
            node('child-a', { children: [node('grandchild')] }),
            node('child-b'),
        ],
    }),
    node('sibling'),
];

describe('uid', () => {
    it('genera ids con prefijo de timestamp y sufijo aleatorio', () => {
        const id = uid();
        expect(id).toMatch(/^\d+_[0-9a-z]{4}$/);
    });

    it('no colisiona en llamadas sucesivas', () => {
        const ids = new Set(Array.from({ length: 50 }, () => uid()));
        expect(ids.size).toBe(50);
    });
});

describe('updateNodeDeep', () => {
    it('parchea el nodo anidado sin mutar el árbol original', () => {
        const original = tree();
        const snapshot = JSON.stringify(original);

        const next = updateNodeDeep(original, 'grandchild', { label: 'cambiado', x: 12 });

        expect(findNodeDeep(next, 'grandchild')?.label).toBe('cambiado');
        expect(findNodeDeep(next, 'grandchild')?.x).toBe(12);
        expect(findNodeDeep(original, 'grandchild')?.label).toBe('grandchild');
        expect(JSON.stringify(original)).toBe(snapshot);
    });

    it('devuelve un árbol equivalente si el id no existe', () => {
        const original = tree();
        const next = updateNodeDeep(original, 'missing', { label: 'x' });
        expect(findAllNodes(next)).toHaveLength(findAllNodes(original).length);
        expect(findNodeDeep(next, 'missing')).toBeNull();
    });
});

describe('removeNodeDeep', () => {
    it('elimina el nodo y su subárbol en cualquier nivel', () => {
        const next = removeNodeDeep(tree(), 'child-a');
        const ids = findAllNodes(next).map(n => n.id);

        expect(ids).not.toContain('child-a');
        expect(ids).not.toContain('grandchild');
        expect(ids).toContain('child-b');
        expect(ids).toContain('root');
    });
});

describe('addChildToNode', () => {
    it('añade el hijo al padre indicado y conserva los demás', () => {
        const next = addChildToNode(tree(), 'child-b', node('new-child'));
        const parent = findNodeDeep(next, 'child-b');

        expect(parent?.children.map(c => c.id)).toEqual(['new-child']);
        expect(findNodeDeep(next, 'child-a')?.children).toHaveLength(1);
    });
});

describe('findNodeDeep / findAllNodes', () => {
    it('encuentra nodos anidados y aplana en orden depth-first', () => {
        const flat = findAllNodes(tree()).map(n => n.id);
        expect(flat).toEqual(['root', 'child-a', 'grandchild', 'child-b', 'sibling']);
        expect(findNodeDeep(tree(), 'grandchild')?.id).toBe('grandchild');
        expect(findNodeDeep(tree(), 'nope')).toBeNull();
    });
});

describe('createNode / createChildNode', () => {
    it('asigna id y children por defecto sin mutar el partial', () => {
        const partial = { type: 'phrase' as const, role: 'r', label: 'l', x: 1, y: 2, color: '#000' };
        const created = createNode(partial);

        expect(created.id).toMatch(/^\d+_/);
        expect(created.children).toEqual([]);
        expect(partial).not.toHaveProperty('id');
        expect(partial).not.toHaveProperty('children');
    });

    it('createChildNode usa los valores por defecto del botón "añadir hijo"', () => {
        const child = createChildNode();
        const { id, ...rest } = child;

        expect(id).toMatch(/^\d+_/);
        expect({ ...rest, children: [] }).toMatchObject({ ...DEFAULT_CHILD_NODE, children: [] });
        expect(rest.children).toEqual([]);
    });
});

describe('createConnection', () => {
    it('crea una conexión dependency con id nuevo por defecto', () => {
        const conn = createConnection('a', 'b');
        const expected: SyntaxConnection = {
            id: conn.id,
            fromId: 'a',
            toId: 'b',
            connectionType: 'dependency',
        };

        expect(conn).toEqual(expected);
        expect(conn.id).toMatch(/^\d+_/);
    });

    it('respeta el tipo de conexión explícito', () => {
        expect(createConnection('a', 'b', 'agreement').connectionType).toBe('agreement');
    });
});

describe('zoom', () => {
    it('clampZoom limita al rango y tolera valores no finitos', () => {
        expect(MIN_ZOOM).toBe(0.2);
        expect(MAX_ZOOM).toBe(3);
        expect(clampZoom(0.05)).toBe(MIN_ZOOM);
        expect(clampZoom(9)).toBe(MAX_ZOOM);
        expect(clampZoom(1.5)).toBe(1.5);
        expect(clampZoom(Number.NaN)).toBe(1);
    });

    it('zoomStep sube y baja con clamp', () => {
        expect(zoomStep(1, 'in')).toBeCloseTo(1.2);
        expect(zoomStep(1, 'out')).toBeCloseTo(0.8);
        expect(zoomStep(0.1, 'out')).toBe(MIN_ZOOM);
        expect(zoomStep(3.5, 'in')).toBe(MAX_ZOOM);
    });

    it('zoomByWheel aplica el factor según el signo de deltaY', () => {
        expect(zoomByWheel(1, 100)).toBeCloseTo(0.9);
        expect(zoomByWheel(1, -100)).toBeCloseTo(1.1);
        expect(zoomByWheel(1, 0)).toBeCloseTo(1.1);
    });
});

describe('toCanvasPoint / toNodeBounds', () => {
    const camera = { pan: { x: 10, y: 20 }, zoom: 2 };

    it('mapea un punto de pantalla al espacio del canvas', () => {
        expect(toCanvasPoint(110, 220, { left: 100, top: 200 }, camera)).toEqual({ x: 0, y: 0 });
        expect(toCanvasPoint(130, 240, { left: 100, top: 200 }, camera)).toEqual({ x: 10, y: 10 });
    });

    it('mapea un rectángulo DOM a bounds del canvas', () => {
        const bounds = toNodeBounds(
            { left: 110, top: 220, width: 40, height: 20 },
            { left: 100, top: 200 },
            camera
        );

        expect(bounds).toEqual({ x: 0, y: 0, w: 20, h: 10 });
    });
});

describe('buildConnectionPath', () => {
    const from: NodeBounds = { x: 0, y: 0, w: 100, h: 40 };
    const to: NodeBounds = { x: 200, y: 100, w: 100, h: 40 };

    it('construye la bezier entre centros con su punto medio', () => {
        const path = buildConnectionPath(from, to);

        expect(path.startX).toBe(50);
        expect(path.startY).toBe(20);
        expect(path.endX).toBe(250);
        expect(path.endY).toBe(120);
        expect(path.midX).toBe(150);
        expect(path.midY).toBe(70);
        expect(path.d).toBe('M 50 20 C 150 20, 150 120, 250 120');
    });

    it('es simétrica en los extremos', () => {
        const reversed = buildConnectionPath(to, from);
        expect(reversed.d).toBe('M 250 120 C 150 120, 150 20, 50 20');
    });
});
