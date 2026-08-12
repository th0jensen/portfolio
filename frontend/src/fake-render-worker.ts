// Stand-in for the real SSR renderer (./render-worker.ts), used only by
// RendererClient tests in backend/src/renderer.rs — never imported or
// bundled by the actual app. Speaks the same line-delimited JSON protocol
// over stdin/stdout as a real `deno` child process, so worker spawning,
// crashes, and malformed responses can be exercised the same way
// production spawns the renderer.
//
// The worker-timeout/restart path is covered separately against the real
// renderer binary (see real_renderer_worker_times_out_and_is_replaced in
// renderer.rs), so this fixture only needs to cover faults that a
// well-behaved renderer can never produce on its own:
// - /experience exits mid-request (crash path)
// - /contact replies with a mismatched id
// - /projects replies with invalid JSON
// - anything else echoes the url and a per-process call count, so a reset
//   count observed by a test proves a fresh worker was spawned
//
// argv[0] controls startup instead: "no-ready" exits before ever announcing
// readiness, "bad-ready" announces readiness with garbage JSON, "slow-ready"
// never announces it.

const encoder = new TextEncoder();

// A bare `new Promise(() => {})` never registers any pending macrotask, so
// Deno's top-level-await deadlock detector treats it as a stall and aborts
// the process instead of actually hanging. A far-future timer is genuine
// pending work, so Deno waits on it for real until the test kills us.
function hangForever(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 2_147_000_000));
}

function writeLine(text: string): Promise<void> {
  return Deno.stdout.write(encoder.encode(text + '\n')).then(() => {});
}

async function* readLines(
  readable: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = readable.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      yield buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
    }
  }
}

function respond(id: number, url: string, calls: number): Promise<void> {
  return writeLine(JSON.stringify({
    id,
    status: 200,
    html: `<html>${url}:${calls}</html>`,
    error: null,
    headers: {},
  }));
}

switch (Deno.args[0]) {
  case 'no-ready':
    Deno.exit(0);
    break;
  case 'bad-ready':
    await writeLine('not json');
    break;
  case 'slow-ready':
    await hangForever();
    break;
  default:
    await writeLine(JSON.stringify({ type: 'ready' }));
}

let calls = 0;
for await (const line of readLines(Deno.stdin.readable)) {
  const request = JSON.parse(line);
  calls += 1;

  switch (request.url) {
    case '/experience':
      Deno.exit(1);
      break;
    case '/contact':
      await respond(request.id + 1000, request.url, calls);
      break;
    case '/projects':
      await writeLine('not valid json');
      break;
    default:
      await respond(request.id, request.url, calls);
  }
}
