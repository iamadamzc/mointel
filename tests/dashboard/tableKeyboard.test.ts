/**
 * Board rows are controls, and controls answer to a keyboard.
 *
 * Before this the rows had no tabindex, no role and no key handler: the ticker
 * dossier — the product's whole investigative surface — could not be opened
 * without a mouse. These fix the behaviour a row must have.
 */

import { describe, expect, it, vi } from 'vitest';

import { rowKeyHandler, rowKeyboardProps } from '@/components/tableKeyboard';

interface FakeRow {
  focus: () => void;
  nextElementSibling: FakeRow | null;
  previousElementSibling: FakeRow | null;
  parentElement: { firstElementChild: FakeRow | null; lastElementChild: FakeRow | null } | null;
}

/** A tbody of rows, wired the way the DOM wires them. */
function rows(count: number): FakeRow[] {
  const made: FakeRow[] = Array.from({ length: count }, () => ({
    focus: vi.fn(),
    nextElementSibling: null,
    previousElementSibling: null,
    parentElement: null,
  }));

  const body = { firstElementChild: made[0] ?? null, lastElementChild: made.at(-1) ?? null };
  made.forEach((row, index) => {
    row.nextElementSibling = made[index + 1] ?? null;
    row.previousElementSibling = made[index - 1] ?? null;
    row.parentElement = body;
  });

  return made;
}

function press(key: string, row: FakeRow, target: unknown = row) {
  const event = {
    key,
    target,
    currentTarget: row,
    preventDefault: vi.fn(),
  };
  return event;
}

describe('rowKeyHandler', () => {
  it('opens the dossier on Enter and on Space', () => {
    const open = vi.fn();
    const [row] = rows(1);
    const handler = rowKeyHandler(open);

    const enter = press('Enter', row!);
    handler(enter as never);
    const space = press(' ', row!);
    handler(space as never);

    expect(open).toHaveBeenCalledTimes(2);
    expect(enter.preventDefault).toHaveBeenCalled();
    expect(space.preventDefault).toHaveBeenCalled();
  });

  it('moves a cursor down and up the board', () => {
    const [first, second, third] = rows(3);
    const handler = rowKeyHandler(vi.fn());

    handler(press('ArrowDown', first!) as never);
    expect(second!.focus).toHaveBeenCalled();

    handler(press('ArrowUp', third!) as never);
    expect(second!.focus).toHaveBeenCalledTimes(2);
  });

  it('jumps to the first and last row', () => {
    const [first, second, third] = rows(3);
    const handler = rowKeyHandler(vi.fn());

    handler(press('End', second!) as never);
    expect(third!.focus).toHaveBeenCalled();

    handler(press('Home', second!) as never);
    expect(first!.focus).toHaveBeenCalled();
  });

  it('stops at the ends rather than wrapping', () => {
    const [first, second] = rows(2);
    const handler = rowKeyHandler(vi.fn());

    handler(press('ArrowUp', first!) as never);
    handler(press('ArrowDown', second!) as never);

    expect(first!.focus).not.toHaveBeenCalled();
    expect(second!.focus).not.toHaveBeenCalled();
  });

  it('leaves keys pressed inside the row’s own star button alone', () => {
    const open = vi.fn();
    const [row] = rows(1);
    const handler = rowKeyHandler(open);

    // A Space on the focus toggle must pin the ticker, not open the drawer.
    handler(press(' ', row!, { nodeName: 'BUTTON' }) as never);

    expect(open).not.toHaveBeenCalled();
  });

  it('ignores keys it does not own', () => {
    const open = vi.fn();
    const [first, second] = rows(2);
    const handler = rowKeyHandler(open);

    const event = press('a', first!);
    handler(event as never);

    expect(open).not.toHaveBeenCalled();
    expect(second!.focus).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});

describe('rowKeyboardProps', () => {
  it('makes the row reachable and describes it', () => {
    const props = rowKeyboardProps('SUGP, rank 3. Open dossier.', vi.fn());

    expect(props.tabIndex).toBe(0);
    expect(props.role).toBe('button');
    expect(props['aria-label']).toContain('SUGP');
    expect(typeof props.onKeyDown).toBe('function');
  });
});
