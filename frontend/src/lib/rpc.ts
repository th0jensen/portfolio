import { build_client, http } from '@qubit-rs/client';
import type { QubitServer } from '../bindings';

const api = build_client<QubitServer>(http(`${window.location.origin}/rpc`));
export default api;
