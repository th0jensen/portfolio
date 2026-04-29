import { build_client, http } from '@qubit-rs/client';
import type { QubitServer } from '../bindings';

const origin = typeof window !== 'undefined' ? window.location.origin : '';
const api = build_client<QubitServer>(http(`${origin}/rpc`));
export default api;
