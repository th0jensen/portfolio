import assert from 'node:assert/strict';
import { AutomatonEngine, type AutomatonExports, type GridDescriptor } from './automaton.ts';

function mockWasm(template = { width: 3, height: 5, automatonId: 3 }) {
  const memory = new WebAssembly.Memory({ initial: 1 });
  const requests: [number, number][] = [];
  const stateFiles: string[] = [];
  let pointer = 0;
  function allocate(width: number, height: number): GridDescriptor {
    const descriptor = { pointer, width, height };
    pointer += width * height * Int32Array.BYTES_PER_ELEMENT;
    // Grow on every allocation to exercise the engine's detached-buffer handling.
    memory.grow(Math.max(1, Math.ceil((pointer - memory.buffer.byteLength) / 65536)));
    return descriptor;
  }
  const exports = {
    memory,
    createGrid(width: number, height: number) {
      requests.push([width, height]);
      return Promise.resolve(allocate(width, height));
    },
    createGridFromState(stateFile: string) {
      stateFiles.push(stateFile);
      const descriptor = allocate(template.width, template.height);
      new Int32Array(memory.buffer, descriptor.pointer, template.width * template.height)
        .set(Array.from({ length: template.width * template.height }, (_, index) => index % 4));
      return Promise.resolve({ ...descriptor, automatonId: template.automatonId });
    },
    nextGrid() {
      throw new Error('Unexpected step');
    },
  } as unknown as AutomatonExports;
  return { engine: new AutomatonEngine(exports), requests, stateFiles };
}

Deno.test('resize normalizes dimensions independently and keeps the one-argument square default', async () => {
  const { engine, requests } = mockWasm();
  await engine.resize(11.6, 8.4);
  await engine.resize(-10, 900);
  await engine.resize(NaN, 13);
  await engine.resize(14, Infinity);
  const square = await engine.resize(9.6);
  assert.deepEqual(requests, [[12, 8], [8, 300], [72, 13], [14, 72], [10, 10]]);
  assert.equal(square.width, 10);
  assert.equal(square.height, 10);
  assert.equal(engine.grid, square);
});

Deno.test('asymmetric resize centers contents while growing one axis and cropping the other', async () => {
  const { engine } = mockWasm();
  const original = await engine.resize(10, 13);
  original.cells.set(Array.from({ length: 130 }, (_, index) => index + 1));

  const wide = await engine.resize(15, 8);
  assert.equal(wide.width, 15);
  assert.equal(wide.height, 8);
  assert.deepEqual(
    [...wide.cells],
    Array.from({ length: 120 }, (_, index) => {
      const x = index % 15;
      const y = Math.floor(index / 15);
      return x >= 2 && x < 12 ? (y + 2) * 10 + (x - 2) + 1 : 0;
    }),
  );

  const tall = await engine.resize(8, 13);
  assert.equal(tall.width, 8);
  assert.equal(tall.height, 13);
  assert.deepEqual(
    [...tall.cells],
    Array.from({ length: 104 }, (_, index) => {
      const x = index % 8;
      const y = Math.floor(index / 8);
      return y >= 2 && y < 10 ? y * 10 + (x + 1) + 1 : 0;
    }),
  );
});

Deno.test('rectangular templates retain native dimensions, cells, and automaton ID without reallocating', async () => {
  for (
    const template of [
      { width: 3, height: 5, automatonId: 3 },
      { width: 17, height: 9, automatonId: 2 },
    ]
  ) {
    const { engine, requests, stateFiles } = mockWasm(template);
    await engine.resize(12);
    const { grid, automatonId } = await engine.loadState('template contents');
    assert.equal(grid.width, template.width);
    assert.equal(grid.height, template.height);
    assert.equal(automatonId, template.automatonId);
    assert.equal(engine.grid, grid);
    assert.deepEqual(
      [...grid.cells],
      Array.from({ length: template.width * template.height }, (_, index) => index % 4),
    );
    assert.deepEqual(stateFiles, ['template contents']);
    assert.deepEqual(requests, [[12, 12]]);
  }
});
