import { ConsoleStdout, File, OpenFile, WASI } from '@bjorn3/browser_wasi_shim';

type MakeJsFfiImports = (
    exports: Record<string, unknown>,
) => WebAssembly.ModuleImports;

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
        summary: 'Survival at two or three neighbours; birth at three.',
        defaultState: 1,
        states: [
            {
                value: 0,
                label: 'Dead',
                color: '#000000',
                lightColor: '#ffffff',
            },
            {
                value: 1,
                label: 'Alive',
                color: '#ffffff',
                lightColor: '#111827',
            },
        ],
    },
    {
        id: 1,
        name: 'Seeds',
        summary: 'Every cell dies; empty cells with two neighbours are born.',
        defaultState: 1,
        states: [
            {
                value: 0,
                label: 'Dead',
                color: '#000000',
                lightColor: '#ffffff',
            },
            {
                value: 1,
                label: 'Alive',
                color: '#78ff78',
                lightColor: '#16813e',
            },
        ],
    },
    {
        id: 2,
        name: "Brian's Brain",
        summary: 'Cells cycle through on, dying, and off states.',
        defaultState: 1,
        states: [
            {
                value: 0,
                label: 'Dead',
                color: '#000000',
                lightColor: '#ffffff',
            },
            {
                value: 1,
                label: 'Alive',
                color: '#ffffff',
                lightColor: '#111827',
            },
            {
                value: 2,
                label: 'Dying',
                color: '#5078ff',
                lightColor: '#3156c7',
            },
        ],
    },
    {
        id: 3,
        name: 'Wireworld',
        summary: 'Signals move through painted conductor paths.',
        defaultState: 3,
        states: [
            {
                value: 0,
                label: 'Empty',
                color: '#000000',
                lightColor: '#ffffff',
            },
            {
                value: 3,
                label: 'Conductor',
                color: '#1c2b23',
                lightColor: '#557a5f',
            },
            {
                value: 1,
                label: 'Electron head',
                color: '#1450dc',
                lightColor: '#123fae',
            },
            {
                value: 2,
                label: 'Electron tail',
                color: '#848aab',
                lightColor: '#646b87',
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
        templates: [{ name: 'Oscillator', path: 'conway/oscillator.toml' }],
    },
    {
        automatonId: 1,
        label: 'Seeds',
        templates: [{ name: 'Triangle', path: 'seeds/triangle.toml' }],
    },
    {
        automatonId: 2,
        label: "Brian's Brain",
        templates: [{ name: 'Diamond', path: 'briansbrain/diamond.toml' }],
    },
    {
        automatonId: 3,
        label: 'Wireworld',
        templates: [
            { name: 'Circular signal', path: 'wireworld/circular.toml' },
            { name: 'XOR gate', path: 'wireworld/xor.toml' },
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
    const wasi = new WASI(
        ['automaton'],
        [],
        [
            new OpenFile(new File([])),
            ConsoleStdout.lineBuffered((line) => console.log(line)),
            ConsoleStdout.lineBuffered((line) => console.error(line)),
        ],
    );
    const exportsForImports: Record<string, unknown> = {};

    const jsFfiUrl = '/static/automaton/automaton.js';
    const wasmUrl = '/static/automaton/automaton.wasm';
    const [jsFfiModule, response] = await Promise.all([
        // This module is generated at deployment time, so Vite must leave its
        // URL external rather than resolving or bundling it at build time.
        import(/* @vite-ignore */ jsFfiUrl) as Promise<{
            default: MakeJsFfiImports;
        }>,
        fetch(wasmUrl),
    ]);

    const imports = {
        ghc_wasm_jsffi: jsFfiModule.default(exportsForImports),
        wasi_snapshot_preview1: wasi.wasiImport,
    };

    if (!response.ok) {
        throw new Error(
            `Failed to load WASM: ${response.status} ${response.statusText}`,
        );
    }

    const contentType = response.headers.get('content-type')
        ?.split(';', 1)[0]
        .trim();
    const { instance } = contentType === 'application/wasm'
        ? await WebAssembly.instantiateStreaming(response, imports)
        : await WebAssembly.instantiate(await response.arrayBuffer(), imports);

    const automatonExports = instance.exports as AutomatonExports & {
        _initialize?: () => unknown;
    };
    Object.assign(exportsForImports, automatonExports);
    wasi.initialize({ exports: automatonExports });

    return automatonExports;
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
                throw new Error('The WASM module returned a non-square grid.');
            }
            const grid = this.grid;
            if (!grid) {
                throw new Error('The WASM module returned an empty grid.');
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
            if (typeof this.exports.createGridFromState !== 'function') {
                throw new Error(
                    'The loaded WASM module does not export createGridFromState.',
                );
            }
            const loaded = await this.exports.createGridFromState(stateFile);
            if (
                !automata.some((definition) =>
                    definition.id === loaded.automatonId
                )
            ) {
                throw new Error(
                    `The template returned an unknown automaton ID: ${loaded.automatonId}`,
                );
            }

            this.setDescriptor(loaded);
            const loadedGrid = this.grid;
            if (!loadedGrid) {
                throw new Error(
                    'The WASM module returned an empty template grid.',
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
                        'The WASM module returned an empty square grid.',
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
