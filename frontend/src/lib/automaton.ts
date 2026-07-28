const wasiSuccess = 0;
const wasiNotImplemented = 52;

type MakeJsFfiImports = (
  exports: Record<string, unknown>,
) => WebAssembly.ModuleImports;

function createWasi(args: string[]) {
  let memory: WebAssembly.Memory;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const encodedArgs = args.map((argument) => encoder.encode(argument));

  // Returns a structured view over the current WebAssembly memory buffer.
  const dataView = () => new DataView(memory.buffer);
  // Returns a byte view over the current WebAssembly memory buffer.
  const memoryBytes = () => new Uint8Array(memory.buffer);

  const functions = {
    // Reports the number and total encoded size of command-line arguments.
    args_sizes_get(
      argumentCountPointer: number,
      bufferSizePointer: number,
    ): number {
      const view = dataView();
      view.setUint32(argumentCountPointer, encodedArgs.length, true);
      view.setUint32(
        bufferSizePointer,
        encodedArgs.reduce(
          (size, argument) => size + argument.length + 1,
          0,
        ),
        true,
      );
      return wasiSuccess;
    },

    // Writes command-line argument pointers and strings into WebAssembly memory.
    args_get(argumentPointers: number, argumentBuffer: number): number {
      const view = dataView();
      const bytes = memoryBytes();
      let cursor = argumentBuffer;
      encodedArgs.forEach((argument, index) => {
        view.setUint32(argumentPointers + index * 4, cursor, true);
        bytes.set(argument, cursor);
        bytes[cursor + argument.length] = 0;
        cursor += argument.length + 1;
      });
      return wasiSuccess;
    },

    // Reports an empty environment to the WebAssembly program.
    environ_sizes_get(countPointer: number, sizePointer: number): number {
      const view = dataView();
      view.setUint32(countPointer, 0, true);
      view.setUint32(sizePointer, 0, true);
      return wasiSuccess;
    },

    // Completes environment loading without writing any variables.
    environ_get(): number {
      return wasiSuccess;
    },

    // Reports the browser clock resolution in nanoseconds.
    clock_res_get(_clockId: number, resolutionPointer: number): number {
      dataView().setBigUint64(resolutionPointer, 1_000_000n, true);
      return wasiSuccess;
    },

    // Writes the current realtime or monotonic clock value in nanoseconds.
    clock_time_get(
      clockId: number,
      _precision: bigint,
      timePointer: number,
    ): number {
      const nanoseconds = clockId === 0
        ? BigInt(Date.now()) * 1_000_000n
        : BigInt(Math.floor(performance.now() * 1_000_000));
      dataView().setBigUint64(timePointer, nanoseconds, true);
      return wasiSuccess;
    },

    // Fills a WebAssembly memory range with cryptographically secure random bytes.
    random_get(bufferPointer: number, bufferLength: number): number {
      const target = new Uint8Array(
        memory.buffer,
        bufferPointer,
        bufferLength,
      );
      for (let offset = 0; offset < target.length; offset += 65_536) {
        crypto.getRandomValues(
          target.subarray(
            offset,
            Math.min(offset + 65_536, target.length),
          ),
        );
      }
      return wasiSuccess;
    },

    // Decodes WASI output buffers and forwards them to the browser console.
    fd_write(
      fd: number,
      iovecsPointer: number,
      iovecsLength: number,
      writtenPointer: number,
    ): number {
      const view = dataView();
      let written = 0;
      let output = "";
      for (let i = 0; i < iovecsLength; i += 1) {
        const iovec = iovecsPointer + i * 8;
        const bufferPointer = view.getUint32(iovec, true);
        const bufferLength = view.getUint32(iovec + 4, true);
        output += decoder.decode(
          new Uint8Array(memory.buffer, bufferPointer, bufferLength),
          { stream: true },
        );
        written += bufferLength;
      }
      view.setUint32(writtenPointer, written, true);
      if (output) {
        (fd === 2 ? console.error : console.log)(
          output.replace(/\n$/, ""),
        );
      }
      return wasiSuccess;
    },

    // Handles standard input as an immediate end-of-file.
    fd_read(
      _fd: number,
      _iovecsPointer: number,
      _iovecsLength: number,
      readPointer: number,
    ): number {
      dataView().setUint32(readPointer, 0, true);
      return wasiSuccess;
    },

    // Writes basic character-device metadata for a standard file descriptor.
    fd_fdstat_get(_fd: number, statPointer: number): number {
      const view = dataView();
      new Uint8Array(memory.buffer, statPointer, 24).fill(0);
      view.setUint8(statPointer, 2);
      view.setBigUint64(statPointer + 8, BigInt.asUintN(64, -1n), true);
      view.setBigUint64(statPointer + 16, BigInt.asUintN(64, -1n), true);
      return wasiSuccess;
    },

    // Accepts file-descriptor close requests without browser-side resources.
    fd_close(): number {
      return wasiSuccess;
    },

    // Treats file-descriptor synchronization as already complete.
    fd_sync(): number {
      return wasiSuccess;
    },

    // Accepts file-descriptor flag changes that have no browser equivalent.
    fd_fdstat_set_flags(): number {
      return wasiSuccess;
    },

    // Allows the single-threaded WASI scheduler to yield successfully.
    sched_yield(): number {
      return wasiSuccess;
    },

    // Converts a WASI process exit into a visible JavaScript error.
    proc_exit(exitCode: number): never {
      throw new Error(`WASI process exited with code ${exitCode}`);
    },
  };

  const imports = new Proxy(
    functions as unknown as Record<string, WebAssembly.ImportValue>,
    {
      // Returns implemented imports or an ENOSYS stub for unused WASI calls.
      get(target, property: string) {
        return target[property] ?? (() => wasiNotImplemented);
      },
    },
  );

  return {
    imports,
    // Attaches linear memory and invokes the reactor initialization export once.
    initialize(instance: WebAssembly.Instance): void {
      const exports = instance.exports as WebAssembly.Exports & {
        memory: WebAssembly.Memory;
        _initialize?: () => void;
      };
      memory = exports.memory;
      exports._initialize?.();
    },
  };
}

export type GridDescriptor = {
  pointer: number;
  width: number;
  height: number;
};

type StateGridDescriptor = GridDescriptor & {
  automatonId: number;
};

export type GridView = GridDescriptor & {
  cells: Int32Array;
};

export type AutomatonId = 0 | 1 | 2 | 3;

export type AutomatonTemplate = {
  name: string;
  path: string;
};

export type AutomatonTemplateGroup = {
  automatonId: AutomatonId;
  label: string;
  templates: readonly AutomatonTemplate[];
};

export type PaintState = {
  value: number;
  label: string;
  color: string;
  lightColor: string;
};

export type AutomatonDefinition = {
  id: AutomatonId;
  name: string;
  summary: string;
  defaultState: number;
  states: PaintState[];
};

export const automata: readonly AutomatonDefinition[] = [
  {
    id: 0,
    name: "Conway's Life",
    summary: "Survival at two or three neighbours; birth at three.",
    defaultState: 1,
    states: [
      {
        value: 0,
        label: "Dead",
        color: "#000000",
        lightColor: "#ffffff",
      },
      {
        value: 1,
        label: "Alive",
        color: "#ffffff",
        lightColor: "#111827",
      },
    ],
  },
  {
    id: 1,
    name: "Seeds",
    summary: "Every cell dies; empty cells with two neighbours are born.",
    defaultState: 1,
    states: [
      {
        value: 0,
        label: "Dead",
        color: "#000000",
        lightColor: "#ffffff",
      },
      {
        value: 1,
        label: "Alive",
        color: "#78ff78",
        lightColor: "#16813e",
      },
    ],
  },
  {
    id: 2,
    name: "Brian's Brain",
    summary: "Cells cycle through on, dying, and off states.",
    defaultState: 1,
    states: [
      {
        value: 0,
        label: "Dead",
        color: "#000000",
        lightColor: "#ffffff",
      },
      {
        value: 1,
        label: "Alive",
        color: "#ffffff",
        lightColor: "#111827",
      },
      {
        value: 2,
        label: "Dying",
        color: "#5078ff",
        lightColor: "#3156c7",
      },
    ],
  },
  {
    id: 3,
    name: "Wireworld",
    summary: "Signals move through painted conductor paths.",
    defaultState: 3,
    states: [
      {
        value: 0,
        label: "Empty",
        color: "#000000",
        lightColor: "#ffffff",
      },
      {
        value: 3,
        label: "Conductor",
        color: "#1c2b23",
        lightColor: "#557a5f",
      },
      {
        value: 1,
        label: "Electron head",
        color: "#1450dc",
        lightColor: "#123fae",
      },
      {
        value: 2,
        label: "Electron tail",
        color: "#848aab",
        lightColor: "#646b87",
      },
    ],
  },
] as const;

export const defaultGridSize = 72;
export const minimumGridSize = 8;
export const maximumGridSize = 300;

export const automatonTemplateGroups: readonly AutomatonTemplateGroup[] = [
  {
    automatonId: 0,
    label: "Conway's Life",
    templates: [{ name: "Oscillator", path: "conway/oscillator.toml" }],
  },
  {
    automatonId: 1,
    label: "Seeds",
    templates: [{ name: "Triangle", path: "seeds/triangle.toml" }],
  },
  {
    automatonId: 2,
    label: "Brian's Brain",
    templates: [{ name: "Diamond", path: "briansbrain/diamond.toml" }],
  },
  {
    automatonId: 3,
    label: "Wireworld",
    templates: [
      { name: "Circular signal", path: "wireworld/circular.toml" },
      { name: "XOR gate", path: "wireworld/xor.toml" },
    ],
  },
];

export function automatonDefinition(id: number): AutomatonDefinition {
  return automata.find((definition) => definition.id === id) ?? automata[0];
}

export function normalizeGridSize(size: number): number {
  if (!Number.isFinite(size)) return defaultGridSize;
  return Math.max(
    minimumGridSize,
    Math.min(maximumGridSize, Math.round(size)),
  );
}

export async function fetchAutomatonTemplate(path: string): Promise<string> {
  const knownTemplate = automatonTemplateGroups.some((group) =>
    group.templates.some((template) => template.path === path)
  );
  if (!knownTemplate) throw new Error(`Unknown automaton template: ${path}`);

  const response = await fetch(`/static/automaton/patterns/${path}`);
  if (!response.ok) {
    throw new Error(
      `Failed to load template: ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
}

export type AutomatonExports = WebAssembly.Exports & {
  memory: WebAssembly.Memory;
  createGrid(width: number, height: number): Promise<GridDescriptor>;
  createGridFromState(stateFile: string): Promise<StateGridDescriptor>;
  nextGrid(pointer: number, automatonId: number): Promise<GridDescriptor>;
};

let automatonPromise: Promise<AutomatonExports> | undefined;

export function getAutomaton(): Promise<AutomatonExports> {
  automatonPromise ??= loadWasm().catch((error) => {
    automatonPromise = undefined;
    throw error;
  });
  return automatonPromise;
}

export async function loadWasm(): Promise<AutomatonExports> {
  const wasi = createWasi(["automaton"]);
  const exportsForImports: Record<string, unknown> = {};

  // Kept non-literal so the build system does not resolve it locally.
  const jsFfiUrl = "/static/automaton/automaton.js";

  const jsFfiModule = (await import(jsFfiUrl)) as {
    default: MakeJsFfiImports;
  };

  const imports = {
    ghc_wasm_jsffi: jsFfiModule.default(exportsForImports),
    wasi_snapshot_preview1: wasi.imports,
  };

  const response = await fetch("/static/automaton/automaton.wasm");

  if (!response.ok) {
    throw new Error(
      `Failed to load WASM: ${response.status} ${response.statusText}`,
    );
  }

  let instance: WebAssembly.Instance;

  try {
    ({ instance } = await WebAssembly.instantiateStreaming(
      response.clone(),
      imports,
    ));
  } catch (error) {
    if (!(error instanceof TypeError)) {
      throw error;
    }

    ({ instance } = await WebAssembly.instantiate(
      await response.arrayBuffer(),
      imports,
    ));
  }

  Object.assign(exportsForImports, instance.exports);
  wasi.initialize(instance);

  return instance.exports as AutomatonExports;
}

/**
 * Owns the Haskell-allocated grid while leaving UI state and scheduling to the
 * island. Views are refreshed after memory growth, so callers can safely read
 * and paint the current grid without handling WebAssembly buffers directly.
 */
export class AutomatonEngine {
  readonly exports: AutomatonExports;

  private descriptor: GridDescriptor | null = null;
  private view: GridView | null = null;
  private pendingStep: Promise<GridView | null> | null = null;

  constructor(exports: AutomatonExports) {
    this.exports = exports;
  }

  get grid(): GridView | null {
    if (!this.descriptor) return null;
    if (
      !this.view || this.view.cells.buffer !== this.exports.memory.buffer
    ) {
      this.view = this.attach(this.descriptor);
    }
    return this.view;
  }

  get busy(): boolean {
    return this.pendingStep !== null;
  }

  idle(): Promise<GridView | null> {
    return this.pendingStep ?? Promise.resolve(this.grid);
  }

  async resize(size: number): Promise<GridView> {
    await this.pendingStep;
    const dimension = normalizeGridSize(size);
    const previous = this.descriptor;
    const previousGrid = this.grid;
    const previousCells = previousGrid?.cells.slice();
    const previousWidth = previousGrid?.width ?? 0;
    const previousHeight = previousGrid?.height ?? 0;

    try {
      const next = await this.exports.createGrid(dimension, dimension);
      this.setDescriptor(next);
      // The descriptor returned by the module is authoritative, but the UI
      // deliberately requests square grids.
      if (next.width !== next.height) {
        throw new Error("The WASM module returned a non-square grid.");
      }
      const grid = this.grid;
      if (!grid) {
        throw new Error("The WASM module returned an empty grid.");
      }

      this.copyCentered(
        previousCells,
        previousWidth,
        previousHeight,
        grid,
      );

      return grid;
    } catch (error) {
      this.setDescriptor(previous);
      throw error;
    }
  }

  async loadState(
    stateFile: string,
  ): Promise<{ grid: GridView; automatonId: AutomatonId }> {
    await this.pendingStep;
    const previous = this.descriptor;

    try {
      if (typeof this.exports.createGridFromState !== "function") {
        throw new Error(
          "The loaded WASM module does not export createGridFromState.",
        );
      }
      const loaded = await this.exports.createGridFromState(stateFile);
      if (
        !automata.some((definition) => definition.id === loaded.automatonId)
      ) {
        throw new Error(
          `The template returned an unknown automaton ID: ${loaded.automatonId}`,
        );
      }

      this.setDescriptor(loaded);
      const loadedGrid = this.grid;
      if (!loadedGrid) {
        throw new Error(
          "The WASM module returned an empty template grid.",
        );
      }

      let grid = loadedGrid;
      if (loadedGrid.width !== loadedGrid.height) {
        const cells = loadedGrid.cells.slice();
        const dimension = Math.max(loadedGrid.width, loadedGrid.height);
        const square = await this.exports.createGrid(
          dimension,
          dimension,
        );
        this.setDescriptor(square);
        const squareGrid = this.grid;
        if (!squareGrid) {
          throw new Error(
            "The WASM module returned an empty square grid.",
          );
        }
        grid = squareGrid;
        this.copyCentered(
          cells,
          loadedGrid.width,
          loadedGrid.height,
          grid,
        );
      }

      return {
        grid,
        automatonId: loaded.automatonId as AutomatonId,
      };
    } catch (error) {
      this.setDescriptor(previous);
      throw error;
    }
  }

  step(automatonId: AutomatonId): Promise<GridView | null> {
    if (this.pendingStep) return this.pendingStep;
    const current = this.descriptor;
    if (!current) return Promise.resolve(null);

    this.pendingStep = this.exports
      .nextGrid(current.pointer, automatonId)
      .then((next) => {
        this.setDescriptor(next);
        return this.grid;
      })
      .catch((error) => {
        this.setDescriptor(current);
        throw error;
      })
      .finally(() => {
        this.pendingStep = null;
      });

    return this.pendingStep;
  }

  clear(): void {
    this.grid?.cells.fill(0);
  }

  sanitize(definition: AutomatonDefinition): void {
    const validStates = new Set(
      definition.states.map((paintState) => paintState.value),
    );
    const cells = this.grid?.cells;
    if (!cells) return;

    for (let index = 0; index < cells.length; index += 1) {
      if (!validStates.has(cells[index])) cells[index] = 0;
    }
  }

  paintLine(
    from: readonly [number, number],
    to: readonly [number, number],
    value: number,
  ): void {
    let [x0, y0] = from;
    const [x1, y1] = to;
    const deltaX = Math.abs(x1 - x0);
    const stepX = x0 < x1 ? 1 : -1;
    const deltaY = -Math.abs(y1 - y0);
    const stepY = y0 < y1 ? 1 : -1;
    let error = deltaX + deltaY;

    while (true) {
      this.paintCell(x0, y0, value);
      if (x0 === x1 && y0 === y1) break;
      const doubledError = error * 2;
      if (doubledError >= deltaY) {
        error += deltaY;
        x0 += stepX;
      }
      if (doubledError <= deltaX) {
        error += deltaX;
        y0 += stepY;
      }
    }
  }

  private paintCell(x: number, y: number, value: number): void {
    const grid = this.grid;
    if (!grid || x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
      return;
    }
    grid.cells[y * grid.width + x] = value;
  }

  private copyCentered(
    source: Int32Array | undefined,
    sourceWidth: number,
    sourceHeight: number,
    target: GridView,
  ): void {
    target.cells.fill(0);
    if (!source) return;

    const copyWidth = Math.min(sourceWidth, target.width);
    const copyHeight = Math.min(sourceHeight, target.height);
    const sourceX = Math.floor((sourceWidth - copyWidth) / 2);
    const sourceY = Math.floor((sourceHeight - copyHeight) / 2);
    const targetX = Math.floor((target.width - copyWidth) / 2);
    const targetY = Math.floor((target.height - copyHeight) / 2);

    for (let row = 0; row < copyHeight; row += 1) {
      const sourceStart = (sourceY + row) * sourceWidth + sourceX;
      const targetStart = (targetY + row) * target.width + targetX;
      target.cells.set(
        source.subarray(sourceStart, sourceStart + copyWidth),
        targetStart,
      );
    }
  }

  private setDescriptor(descriptor: GridDescriptor | null): void {
    this.descriptor = descriptor;
    this.view = descriptor ? this.attach(descriptor) : null;
  }

  private attach(descriptor: GridDescriptor): GridView {
    return {
      ...descriptor,
      cells: new Int32Array(
        this.exports.memory.buffer,
        descriptor.pointer,
        descriptor.width * descriptor.height,
      ),
    };
  }
}
