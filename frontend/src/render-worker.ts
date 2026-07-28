import { TextLineStream } from "@std/streams/text-line-stream";
import type { RenderInput, RenderOutput } from "./bindings/index.ts";
import { render } from "./render.ts";

const lines = Deno.stdin.readable
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(new TextLineStream());

const encoder = new TextEncoder();
const stdout = Deno.stdout.writable.getWriter();

for await (const line of lines) {
  if (!line.trim()) continue;

  let id = 0;

  try {
    const input = JSON.parse(line) as RenderInput;
    id = input.id;

    await send(await render(input));
  } catch (error) {
    await send({
      id,
      status: 500,
      html: null,
      error: error instanceof Error ? error.message : String(error),
      headers: {},
    });
  }
}

stdout.releaseLock();

async function send(output: RenderOutput): Promise<void> {
  await stdout.write(
    encoder.encode(`${JSON.stringify(output)}\n`),
  );
}
