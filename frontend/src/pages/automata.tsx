import ilha from 'ilha';
import Automaton from '../islands/automaton_island.tsx';

export default ilha.render(() => {
  return (
    <section
      id='automaton'
      class='automaton-page touch-manipulation overscroll-none'
    >
      <header class='relative shrink-0 overflow-hidden border-b border-border'>
        <div class='technical-grid absolute inset-0 opacity-35' />
        <div class='absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--background)/0.98),hsl(var(--background)/0.78))]' />
        <div class='relative mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-5 px-7 py-6 sm:px-9 sm:py-6 lg:px-10 lg:py-4'>
          <div class='min-w-0'>
            <p class='font-mono text-[0.625rem] uppercase tracking-[0.16em] text-primary'>
              ##LAB## / Haskell → WASM
            </p>
            <h1 class='mt-1 text-[clamp(1.65rem,4vw,2.75rem)] font-bold leading-none tracking-tighter'>
              Cellular Automata
            </h1>
          </div>
        </div>
      </header>

      <div class='automaton-island-host mx-auto min-h-0 w-full max-w-7xl flex-1 px-0 pb-7 sm:px-4 lg:px-10 lg:pb-0'>
        <Automaton />
      </div>
    </section>
  );
});
