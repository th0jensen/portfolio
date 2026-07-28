import { build_client, http } from '@qubit-rs/client';
import type { QubitServer } from '../bindings/index.ts';

const origin = typeof window !== 'undefined' ? globalThis.location.origin : '';
const api = build_client<QubitServer>(http(`${origin}/rpc`));
export default api;
