import ilha from 'ilha';
import Automaton from '../islands/automaton_island';
import { locale } from '../lib/locale';

export default ilha.render(() => {
  const isNorwegian = locale() === 'no';

  return (
    <section
      id='automaton'
      class='automaton-page touch-manipulation overscroll-none'
    >
      <header class='relative shrink-0 overflow-hidden border-b border-border'>
        <div class='technical-grid absolute inset-0 opacity-35' />
        <div class='absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--background)/0.98),hsl(var(--background)/0.78))]' />
        <div class='relative mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-5 px-5 py-3 sm:px-8 sm:py-4 lg:px-10'>
          <div class='min-w-0'>
            <p class='font-mono text-[0.625rem] uppercase tracking-[0.16em] text-primary'>
              04 / Haskell → WASM
            </p>
            <h1 class='mt-1 text-[clamp(1.65rem,4vw,2.75rem)] font-bold leading-none tracking-tighter'>
              {isNorwegian ? 'Cellulære automater' : 'Cellular automata'}
            </h1>
          </div>
          <p class='hidden max-w-xl text-sm leading-6 text-muted-foreground sm:block lg:text-[0.9375rem]'>
            {isNorwegian
              ? 'Fire regler kjøres i Haskell-kompilert WebAssembly. Tegn direkte i lineært minne, og la modulen beregne hver generasjon.'
              : 'Four rules run in Haskell-compiled WebAssembly. Paint directly into linear memory, then let the module compute each generation.'}
          </p>
        </div>
      </header>

      <div class='automaton-island-host mx-auto min-h-0 w-full max-w-7xl flex-1 px-0 sm:px-4 lg:px-10'>
        <Automaton />
      </div>
    </section>
  );
});
