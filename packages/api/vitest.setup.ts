// Ensure CRDT proto file is loaded before tests run
// This ensures the proto namespace is set up on globalThis before
// CRDT exports try to access it
import '@actual-app/crdt/proto/sync_pb.js';
