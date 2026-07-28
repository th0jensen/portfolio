import ilha, { batch } from "ilha";
import {
  Eraser,
  Pause,
  Play,
  RefreshCw,
  Settings2,
  StepForward,
  X,
} from "lucide";
import {
  automata,
  type AutomatonDefinition,
  automatonDefinition,
  AutomatonEngine,
  type AutomatonId,
  automatonTemplateGroups,
  defaultGridSize,
  fetchAutomatonTemplate,
  getAutomaton,
  maximumGridSize,
  minimumGridSize,
  normalizeGridSize,
} from "../lib/automaton.ts";
import Icon from "../lib/icon.tsx";
import { locale } from "../lib/locale.ts";

type LoadStatus =
  | "loading"
  | "ready"
  | "resizing"
  | "loading-template"
  | "error";

type PaintSession = {
  pointerId: number | null;
  lastCell: readonly [number, number] | null;
};

const paintSessions = new WeakMap<Element, PaintSession>();

function requiredElement<T extends Element>(
  host: Element,
  selector: string,
): T {
  const element = host.querySelector<T>(selector);
  if (!element) throw new Error(`Missing automaton element: ${selector}`);
  return element;
}

function drawGrid(
  host: Element,
  engine: AutomatonEngine,
  definition: AutomatonDefinition,
): void {
  const canvas = requiredElement<HTMLCanvasElement>(
    host,
    "[data-automaton-canvas]",
  );
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas 2D is unavailable.");

  const darkMode = document.documentElement.classList.contains("dark");
  const background = darkMode ? "#000000" : "#ffffff";
  context.imageSmoothingEnabled = false;
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const grid = engine.grid;
  if (!grid) return;

  const cellSize = canvas.width / grid.width;
  const colors = new Map(
    definition.states.map((paintState) => [
      paintState.value,
      darkMode ? paintState.color : paintState.lightColor,
    ]),
  );

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const value = grid.cells[y * grid.width + x];
      if (value === 0) continue;
      context.fillStyle = colors.get(value) ?? background;
      const left = Math.round(x * cellSize);
      const top = Math.round(y * cellSize);
      const right = Math.round((x + 1) * cellSize);
      const bottom = Math.round((y + 1) * cellSize);
      context.fillRect(left, top, right - left, bottom - top);
    }
  }

  const displayedCellSize = canvas.getBoundingClientRect().width / grid.width;
  if (displayedCellSize < 7) return;

  context.fillStyle = darkMode ? "rgb(255 255 255 / 9%)" : "rgb(0 0 0 / 9%)";
  for (let index = 1; index < grid.width; index += 1) {
    const position = Math.round(index * cellSize);
    context.fillRect(position, 0, 1, canvas.height);
    context.fillRect(0, position, canvas.width, 1);
  }
}

function cellFromPointer(
  canvas: HTMLCanvasElement,
  engine: AutomatonEngine,
  event: PointerEvent,
): readonly [number, number] | null {
  const grid = engine.grid;
  if (!grid) return null;

  const bounds = canvas.getBoundingClientRect();
  const x = Math.floor(
    ((event.clientX - bounds.left) / bounds.width) * grid.width,
  );
  const y = Math.floor(
    ((event.clientY - bounds.top) / bounds.height) * grid.height,
  );
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return null;
  return [x, y];
}

function inputNumber(target: EventTarget | null): number | null {
  if (!(target instanceof HTMLInputElement)) return null;
  return Number.isFinite(target.valueAsNumber) ? target.valueAsNumber : null;
}

function hasActiveCells(engine: AutomatonEngine): boolean {
  return engine.grid?.cells.some((cell) => cell !== 0) ?? false;
}

const toolButtonClass =
  "inline-flex h-9 min-w-9 cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-border bg-background px-3 text-[0.8125rem] font-bold text-foreground hover:border-foreground/30 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45";

const toolbarButtonClass =
  `${toolButtonClass} max-[430px]:w-9 max-[430px]:px-0`;

const fieldClass =
  "mt-2 h-9 w-full rounded-sm border border-border bg-background px-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";

const controlSectionClass =
  "min-w-0 border border-border bg-card p-3 max-[540px]:p-2.5 lg:border-x-0 lg:border-t-0 lg:bg-transparent lg:p-4";

export default ilha
  .state("engine", null as AutomatonEngine | null)
  .state("status", "loading" as LoadStatus)
  .state("errorMessage", "")
  .state("automatonId", 0 as AutomatonId)
  .state("automatonName", automata[0].name)
  .state("paintState", 1)
  .state("templatePath", "")
  .state("gridSize", defaultGridSize)
  .state("draftSize", defaultGridSize)
  .state("speed", 12)
  .state("generation", 0)
  .state("running", false)
  .state("controlsOpen", false)
  .state("resumeAfterControls", false)
  .state("darkMode", false)
  .state("canvasSide", 512)
  .state("canvasPixels", 512)
  .onMount(({ host, state }) => {
    let disposed = false;
    let animationFrameId = 0;
    let lastStepTime = performance.now();
    const canvasSpace = requiredElement<HTMLElement>(
      host,
      "[data-canvas-space]",
    );

    const resizeCanvas = () => {
      const bounds = canvasSpace.getBoundingClientRect();
      const styles = getComputedStyle(canvasSpace);
      const horizontalPadding = Number.parseFloat(styles.paddingLeft) +
        Number.parseFloat(styles.paddingRight);
      const verticalPadding = Number.parseFloat(styles.paddingTop) +
        Number.parseFloat(styles.paddingBottom);
      const side = Math.max(
        1,
        Math.floor(
          Math.min(
            bounds.width - horizontalPadding,
            bounds.height - verticalPadding,
          ),
        ),
      );
      const pixels = Math.max(
        1,
        Math.round(side * (globalThis.devicePixelRatio || 1)),
      );
      batch(() => {
        state.canvasSide(side);
        state.canvasPixels(pixels);
      });
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvasSpace);
    resizeCanvas();

    const syncTheme = () => {
      state.darkMode(document.documentElement.classList.contains("dark"));
    };
    const themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["class"],
      attributes: true,
    });
    syncTheme();

    const fail = (error: unknown) => {
      if (disposed) return;
      state.running(false);
      state.status("error");
      state.errorMessage(
        error instanceof Error ? error.message : String(error),
      );
    };

    const animate = (timestamp: number) => {
      const engine = state.engine();
      if (
        engine &&
        state.running() &&
        state.status() === "ready" &&
        !engine.busy
      ) {
        const interval = 1000 / state.speed();
        if (timestamp - lastStepTime >= interval) {
          lastStepTime = timestamp;
          const automatonId = state.automatonId();
          void engine
            .step(automatonId)
            .then((grid) => {
              if (disposed || !grid) return;
              state.generation(state.generation() + 1);
              if (!hasActiveCells(engine)) state.running(false);
              drawGrid(
                host,
                engine,
                automatonDefinition(automatonId),
              );
            })
            .catch(fail);
        }
      } else {
        lastStepTime = timestamp;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    void (async () => {
      try {
        const engine = new AutomatonEngine(await getAutomaton());
        if (disposed) return;
        await engine.resize(state.gridSize());
        if (disposed) return;
        batch(() => {
          state.engine(engine);
          state.status("ready");
          state.errorMessage("");
        });
        drawGrid(
          host,
          engine,
          automatonDefinition(state.automatonId()),
        );
      } catch (error) {
        fail(error);
      }
    })();

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      paintSessions.delete(host);
    };
  })
  .effect(({ host, state }) => {
    const engine = state.engine();
    const automatonId = state.automatonId();
    state.generation();
    state.canvasPixels();
    state.canvasSide();
    state.darkMode();
    if (engine) drawGrid(host, engine, automatonDefinition(automatonId));
  })
  .on("[data-rule]@change:abortable", async ({ event, state }) => {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const ruleId = Number(event.target.value) as AutomatonId;
    const definition = automatonDefinition(ruleId);
    const engine = state.engine();

    if (engine) {
      await engine.idle();
      engine.sanitize(definition);
    }
    batch(() => {
      state.automatonId(ruleId);
      state.automatonName(definition.name);
      state.paintState(definition.defaultState);
      state.generation(0);
      if (engine && !hasActiveCells(engine)) state.running(false);
    });
  })
  .on("[data-template]@change:abortable", async ({ event, host, state }) => {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const engine = state.engine();
    const path = event.target.value;
    if (!engine || !path) return;

    state.status("loading-template");
    const stateFile = await fetchAutomatonTemplate(path);
    const { grid, automatonId } = await engine.loadState(stateFile);
    const definition = automatonDefinition(automatonId);

    batch(() => {
      state.templatePath(path);
      state.automatonId(automatonId);
      state.automatonName(definition.name);
      state.paintState(definition.defaultState);
      state.gridSize(grid.width);
      state.draftSize(grid.width);
      state.generation(0);
      state.status("ready");
      state.errorMessage("");
      if (!hasActiveCells(engine)) state.running(false);
    });
    drawGrid(host, engine, definition);
  })
  .on("[data-grid-size]@input", ({ event, host, state }) => {
    const value = inputNumber(event.target);
    if (value === null) return;
    const size = Math.min(maximumGridSize, Math.round(value));
    state.draftSize(size);
    for (
      const input of host.querySelectorAll<HTMLInputElement>(
        "[data-grid-size]",
      )
    ) {
      input.value = String(size);
    }
  })
  .on("[data-resize-grid]@click:abortable", async ({ host, state }) => {
    const engine = state.engine();
    if (!engine) return;

    const size = normalizeGridSize(state.draftSize());
    const runAfterResize = state.running() || state.resumeAfterControls();
    batch(() => {
      state.status("resizing");
      state.draftSize(size);
    });

    await engine.resize(size);
    batch(() => {
      state.gridSize(size);
      state.generation(0);
      state.status("ready");
      state.errorMessage("");
      state.controlsOpen(false);
      state.resumeAfterControls(false);
      state.running(runAfterResize && hasActiveCells(engine));
    });
    drawGrid(host, engine, automatonDefinition(state.automatonId()));
  })
  .on("[data-speed]@input", ({ event, state }) => {
    const value = inputNumber(event.target);
    if (value !== null) state.speed(Math.max(1, Math.min(60, value)));
  })
  .on("[data-run]@click", ({ state }) => {
    if (state.status() !== "ready") return;
    const engine = state.engine();
    if (!state.running() && (!engine || !hasActiveCells(engine))) return;
    state.running(!state.running());
  })
  .on("[data-step]@click:abortable", async ({ host, state }) => {
    const engine = state.engine();
    if (!engine || state.status() !== "ready") return;

    state.running(false);
    const automatonId = state.automatonId();
    const grid = await engine.step(automatonId);
    if (!grid) return;
    state.generation(state.generation() + 1);
    drawGrid(host, engine, automatonDefinition(automatonId));
  })
  .on("[data-clear]@click:abortable", async ({ host, state }) => {
    const engine = state.engine();
    if (!engine) return;

    state.running(false);
    await engine.idle();
    engine.clear();
    state.generation(0);
    drawGrid(host, engine, automatonDefinition(state.automatonId()));
  })
  .on("[data-settings-toggle]@click", ({ state }) => {
    if (state.controlsOpen()) {
      const shouldResume = state.resumeAfterControls() &&
        state.status() === "ready";
      batch(() => {
        state.controlsOpen(false);
        state.resumeAfterControls(false);
        if (shouldResume) state.running(true);
      });
      return;
    }

    const wasRunning = state.running();
    batch(() => {
      state.controlsOpen(true);
      state.resumeAfterControls(wasRunning);
      if (wasRunning) state.running(false);
    });
  })
  .on("[data-settings-close]@click", ({ state }) => {
    const shouldResume = state.resumeAfterControls() &&
      state.status() === "ready";
    batch(() => {
      state.controlsOpen(false);
      state.resumeAfterControls(false);
      if (shouldResume) state.running(true);
    });
  })
  .on("[data-automaton-canvas]@contextmenu", ({ event }) => {
    event.preventDefault();
  })
  .on("[data-automaton-canvas]@pointerdown", ({ event, host, state }) => {
    const engine = state.engine();
    if (
      !engine ||
      state.status() !== "ready" ||
      !(event.target instanceof HTMLCanvasElement)
    ) {
      return;
    }

    const cell = cellFromPointer(event.target, engine, event);
    if (!cell) return;
    const value = (event.buttons & 2) !== 0 ? 0 : state.paintState();

    event.target.setPointerCapture(event.pointerId);
    engine.paintLine(cell, cell, value);
    paintSessions.set(host, {
      pointerId: event.pointerId,
      lastCell: cell,
    });
    drawGrid(host, engine, automatonDefinition(state.automatonId()));
  })
  .on("[data-automaton-canvas]@pointermove", ({ event, host, state }) => {
    const engine = state.engine();
    const session = paintSessions.get(host);
    if (
      !engine ||
      !session ||
      session.pointerId !== event.pointerId ||
      !(event.target instanceof HTMLCanvasElement)
    ) {
      return;
    }

    const cell = cellFromPointer(event.target, engine, event);
    if (!cell) return;
    const value = (event.buttons & 2) !== 0 ? 0 : state.paintState();
    engine.paintLine(session.lastCell ?? cell, cell, value);
    session.lastCell = cell;
    drawGrid(host, engine, automatonDefinition(state.automatonId()));
  })
  .on("[data-automaton-canvas]@pointerup", ({ event, host }) => {
    if (event.target instanceof HTMLCanvasElement) {
      event.target.releasePointerCapture(event.pointerId);
    }
    paintSessions.delete(host);
  })
  .on("[data-automaton-canvas]@pointercancel", ({ host }) => {
    paintSessions.delete(host);
  })
  .onError(({ error, state }) => {
    state.running(false);
    state.resumeAfterControls(false);
    state.status("error");
    state.errorMessage(error.message);
  })
  .render(({ state }) => {
    const isNorwegian = locale() === "no";
    const definition = automatonDefinition(state.automatonId());
    const disabled = state.status() !== "ready";
    const running = state.running();
    const statusLabel = state.status() === "loading"
      ? isNorwegian ? "Laster Haskell WASM…" : "Loading Haskell WASM…"
      : state.status() === "resizing"
      ? isNorwegian ? "Allokerer rutenett…" : "Allocating grid…"
      : state.status() === "loading-template"
      ? isNorwegian ? "Laster mønster…" : "Loading template…"
      : state.status() === "error"
      ? state.errorMessage()
      : `${state.gridSize()} × ${state.gridSize()} · ${state.automatonName()}`;

    const labels = isNorwegian
      ? {
        parameters: "Parametere",
        template: "Mønster",
        rule: "Regel",
        paint: "Tegnetilstand",
        columns: "Kolonner",
        rows: "Rader",
        apply: "Bruk størrelse",
        speed: "Generasjoner / sekund",
        generation: "Generasjon",
        run: "Kjør",
        pause: "Pause",
        step: "Steg",
        clear: "Tøm",
        close: "Lukk",
        settings: "Innstillinger",
        hint: "Tegn med venstre knapp. Høyreklikk og dra for å viske.",
      }
      : {
        parameters: "Parameters",
        template: "Template",
        rule: "Rule",
        paint: "Paint state",
        columns: "Columns",
        rows: "Rows",
        apply: "Apply size",
        speed: "Generations / second",
        generation: "Generation",
        run: "Run",
        pause: "Pause",
        step: "Step",
        clear: "Clear",
        close: "Close",
        settings: "Settings",
        hint: "Draw with the primary button. Right-click and drag to erase.",
      };

    return (
      <div class="relative grid h-full min-h-0 w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:border-x lg:border-border">
        <div class="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] bg-card">
          <div
            class="technical-grid relative grid min-h-0 min-w-0 place-items-center overflow-hidden bg-background/70 px-3 pt-10 pb-3 max-[540px]:px-[0.45rem] max-[540px]:pt-9 max-[540px]:pb-[0.45rem]"
            data-canvas-space
            aria-busy={state.status() !== "ready"}
          >
            <canvas
              class="block max-h-full max-w-full touch-none cursor-crosshair border border-border bg-white dark:bg-black"
              data-automaton-canvas
              width={state.canvasPixels()}
              height={state.canvasPixels()}
              style={`width:${state.canvasSide()}px;height:${state.canvasSide()}px`}
              aria-label={isNorwegian
                ? "Interaktivt cellulært automatrutenett"
                : "Interactive cellular automaton grid"}
            />

            <div class="pointer-events-none absolute top-3 left-3 flex items-center gap-2 bg-background/90 px-2.5 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground backdrop-blur-sm">
              <span
                class={`h-1.5 w-1.5 ${
                  state.status() === "ready"
                    ? "bg-primary"
                    : "bg-muted-foreground"
                }`}
              />
              <span class="max-w-56 truncate">{statusLabel}</span>
            </div>

            {state.status() !== "ready" && (
              <div class="absolute inset-0 grid place-items-center bg-background/68 px-6 text-center backdrop-blur-[2px]">
                <div>
                  <span class="mx-auto block w-fit text-primary">
                    <Icon
                      node={RefreshCw}
                      size={20}
                      attrs={state.status() === "error"
                        ? ""
                        : 'class="animate-spin"'}
                    />
                  </span>
                  <p class="mt-3 max-w-sm text-sm font-bold">
                    {statusLabel}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div class="grid h-15 min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-t border-border bg-background px-3 max-[540px]:h-13.5 max-[540px]:gap-1.5 max-[540px]:px-2">
            <div class="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                data-run
                class={`${toolbarButtonClass} border-primary bg-primary text-primary-foreground hover:border-primary/90 hover:bg-primary/90`}
                disabled={disabled}
                aria-label={running ? labels.pause : labels.run}
              >
                <Icon node={running ? Pause : Play} size={15} />
                <span class="max-[430px]:sr-only">
                  {running ? labels.pause : labels.run}
                </span>
              </button>
              <button
                type="button"
                data-step
                class={toolbarButtonClass}
                disabled={disabled}
                aria-label={labels.step}
              >
                <Icon node={StepForward} size={15} />
                <span class="max-[430px]:sr-only">
                  {labels.step}
                </span>
              </button>
              <button
                type="button"
                data-clear
                class={toolbarButtonClass}
                disabled={!state.engine()}
                aria-label={labels.clear}
              >
                <Icon node={Eraser} size={15} />
                <span class="max-[430px]:sr-only">
                  {labels.clear}
                </span>
              </button>
            </div>

            <div class="grid justify-items-center whitespace-nowrap font-mono leading-[1.1]">
              <span class="text-[0.5625rem] uppercase tracking-widest text-muted-foreground">
                {labels.generation}
              </span>
              <strong class="mt-0.5 text-[0.6875rem] tabular-nums">
                {String(state.generation()).padStart(4, "0")}
              </strong>
            </div>

            <div class="flex min-w-0 items-center justify-end gap-1.5">
              <span class="whitespace-nowrap font-mono text-[0.6875rem] text-muted-foreground max-[430px]:hidden">
                {state.speed()} / s
              </span>
              <button
                type="button"
                data-settings-toggle
                class={`${toolButtonClass} w-9 px-0 lg:hidden`}
                aria-label={labels.settings}
                aria-expanded={state.controlsOpen()}
              >
                <Icon node={Settings2} size={16} />
              </button>
            </div>
          </div>
        </div>

        {state.controlsOpen() && (
          <button
            type="button"
            data-settings-close
            class="absolute inset-0 z-20 cursor-default bg-transparent lg:hidden"
            aria-label={labels.close}
            tabindex="-1"
          />
        )}

        <aside
          class={state.controlsOpen()
            ? "absolute inset-x-0 bottom-0 z-30 flex max-h-[calc(100%-0.5rem)] flex-col overflow-y-auto border-t border-border bg-background shadow-[0_-8px_24px_hsl(var(--shadow)/0.18)] lg:static lg:max-h-none lg:overflow-hidden lg:border-t-0 lg:border-l lg:border-border lg:bg-card lg:shadow-none"
            : "hidden min-h-0 overflow-hidden bg-card lg:static lg:flex lg:flex-col lg:border-l lg:border-border"}
          aria-label={labels.parameters}
        >
          <div class="flex min-h-13 items-center justify-between gap-2 border-b border-border bg-card px-4 lg:min-h-14">
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <h2 class="shrink-0 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.14em]">
                {labels.parameters}
              </h2>
              <select
                data-template
                class="h-9 min-w-0 flex-1 rounded-sm border border-border bg-background px-2 text-[16px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring lg:text-sm"
                bind:value={state.templatePath}
                disabled={disabled}
                aria-label={labels.template}
              >
                <option value="" disabled>
                  {labels.template}
                </option>
                {automatonTemplateGroups.map((group) => (
                  <optgroup label={group.label}>
                    {group.templates.map((template) => (
                      <option value={template.path}>
                        {template.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <button
              type="button"
              data-settings-close
              class={`${toolButtonClass} w-9 px-0 lg:hidden`}
              aria-label={labels.close}
            >
              <Icon node={X} size={15} />
            </button>
          </div>

          <div class="grid min-h-0 grid-cols-2 gap-3 p-3 max-[540px]:gap-2 max-[540px]:p-2 lg:flex lg:flex-1 lg:flex-col lg:gap-0 lg:p-0">
            <div class={controlSectionClass}>
              <label
                for="automaton-rule"
                class="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground"
              >
                {labels.rule}
              </label>
              <select
                id="automaton-rule"
                data-rule
                class={fieldClass}
                bind:value={state.automatonId}
                disabled={disabled}
              >
                {automata.map((automaton) => (
                  <option value={automaton.id}>
                    {automaton.name}
                  </option>
                ))}
              </select>
              <p class="mt-2 text-xs leading-5 text-muted-foreground">
                {definition.summary}
              </p>
            </div>

            <div class={controlSectionClass}>
              <label
                for="automaton-paint-state"
                class="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground"
              >
                {labels.paint}
              </label>
              <select
                id="automaton-paint-state"
                data-paint-state
                class={fieldClass}
                bind:value={state.paintState}
                disabled={disabled}
              >
                {definition.states.map((paintState) => (
                  <option value={paintState.value}>
                    {paintState.label}
                  </option>
                ))}
              </select>
              <div class="mt-3 flex flex-wrap gap-2">
                {definition.states.map((paintState) => (
                  <span
                    class="inline-flex items-center gap-1.5 font-mono text-[0.5625rem] uppercase tracking-[0.08em] text-muted-foreground"
                    title={paintState.label}
                  >
                    <span
                      class="h-2 w-2 border border-black/20 dark:border-white/20"
                      style={`background:${
                        state.darkMode()
                          ? paintState.color
                          : paintState.lightColor
                      }`}
                    />
                    {paintState.label}
                  </span>
                ))}
              </div>
            </div>

            <div class={controlSectionClass}>
              <div class="grid grid-cols-2 gap-2">
                <label class="min-w-0">
                  <span class="font-mono text-[0.625rem] uppercase tracking-widest text-muted-foreground">
                    {labels.columns}
                  </span>
                  <input
                    data-grid-size
                    class={`${fieldClass} max-[1023px]:text-[16px]`}
                    type="number"
                    inputmode="numeric"
                    min={minimumGridSize}
                    max={maximumGridSize}
                    step="1"
                    value={state.draftSize()}
                    disabled={disabled}
                  />
                </label>
                <label class="min-w-0">
                  <span class="font-mono text-[0.625rem] uppercase tracking-widest text-muted-foreground">
                    {labels.rows}
                  </span>
                  <input
                    data-grid-size
                    class={`${fieldClass} max-[1023px]:text-[16px]`}
                    type="number"
                    inputmode="numeric"
                    min={minimumGridSize}
                    max={maximumGridSize}
                    step="1"
                    value={state.draftSize()}
                    disabled={disabled}
                  />
                </label>
              </div>
              <button
                type="button"
                data-resize-grid
                class={`${toolButtonClass} mt-3 w-full min-w-0 max-w-full overflow-hidden whitespace-nowrap`}
                disabled={disabled ||
                  state.draftSize() === state.gridSize()}
              >
                {labels.apply}
              </button>
            </div>

            <div class={controlSectionClass}>
              <div class="flex items-end justify-between gap-3">
                <label
                  for="automaton-speed"
                  class="font-mono text-[0.625rem] uppercase tracking-widest text-muted-foreground"
                >
                  {labels.speed}
                </label>
                <span class="font-mono text-xs font-bold tabular-nums">
                  {state.speed()}
                </span>
              </div>
              <input
                id="automaton-speed"
                data-speed
                class="mt-3 w-full accent-primary"
                type="range"
                min="1"
                max="60"
                step="1"
                value={state.speed()}
                disabled={disabled}
              />
              <div class="mt-1 flex justify-between font-mono text-[0.5625rem] text-muted-foreground">
                <span>1</span>
                <span>60</span>
              </div>
            </div>
          </div>

          <p class="mt-auto hidden border-t border-border p-4 text-xs leading-5 text-muted-foreground lg:block">
            {labels.hint}
          </p>
        </aside>
      </div>
    );
  });
