import { build_client, http } from '@qubit-rs/client';
import type { QubitServer } from '../bindings';

const api = build_client<QubitServer>(http('http://localhost:8080/rpc'));
export default api;
