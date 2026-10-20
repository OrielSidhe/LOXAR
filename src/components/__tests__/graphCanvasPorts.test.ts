import { describe, it, expect } from 'vitest';
import { DYNAMIC_NODE_PORTS } from '../GraphCanvas';

/**
 * A1: Structural test for the dual-port fix.
 * Finding auditoría 2.1 — handleDrop created nodes with only a 'left' port,
 * and ModuleNodeComponent only renders Handle source if a 'right' port exists.
 * Fix: DYNAMIC_NODE_PORTS must contain BOTH sides.
 */
describe('A1: Dynamic node ports (palette drag → connectable)', () => {
  it('DYNAMIC_NODE_PORTS contains both left and right sides', () => {
    expect(DYNAMIC_NODE_PORTS).toHaveLength(2);
    const sides = DYNAMIC_NODE_PORTS.map((p) => p.side);
    expect(sides).toContain('left');
    expect(sides).toContain('right');
  });

  it('has an "in" port on the left and an "out" port on the right', () => {
    const left = DYNAMIC_NODE_PORTS.find((p) => p.side === 'left');
    const right = DYNAMIC_NODE_PORTS.find((p) => p.side === 'right');
    expect(left).toBeTruthy();
    expect(left?.id).toBe('in');
    expect(right).toBeTruthy();
    expect(right?.id).toBe('out');
  });
});
