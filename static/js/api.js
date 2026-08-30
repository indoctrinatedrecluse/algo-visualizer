// REST + WebSocket client for the Algo Visualizer backend.
//
// The WebSocket is opened lazily (first sort) and auto-reconnects on drop.
// Messages are tagged with a request_id so stale results are ignored.

export class APIClient {
  constructor() {
    this.ws = null;
    this.onResult = null;   // (msg) => void  -- a "result" message
    this.onError = null;    // (message) => void
    this._connecting = null;
  }

  async getAlgorithms() {
    const res = await fetch("/api/algorithms");
    if (!res.ok) throw new Error(`HTTP ${res.status} from /api/algorithms`);
    const data = await res.json();
    return data.algorithms;
  }

  async getAlgorithm(name) {
    const res = await fetch(`/api/algorithms/${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${name}`);
    return res.json();
  }

  // Lazily open the WebSocket. Returns a promise that resolves when open.
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) return this._connecting;
    if (this._connecting) return this._connecting;

    const scheme = location.protocol === "https:" ? "wss://" : "ws://";
    this.ws = new WebSocket(`${scheme}${location.host}/ws`);

    this._connecting = new Promise((resolve) => {
      this.ws.addEventListener("open", () => resolve(), { once: true });
    });

    this.ws.addEventListener("message", (evt) => {
      let msg;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return; // ignore malformed frames
      }
      if (msg.type === "result") this.onResult?.(msg);
      else if (msg.type === "error") this.onError?.(msg.message || "Unknown error");
    });

    this.ws.addEventListener("close", () => {
      this.ws = null;
      this._connecting = null;
      setTimeout(() => this.connect(), 1000); // auto-reconnect
    });

    this.ws.addEventListener("error", () => this.ws?.close());

    return this._connecting;
  }

  async requestSort(algorithm, array, requestId, target, graph, start, tree, key, network) {
    await this.connect();
    const msg = { action: "sort", algorithm, request_id: requestId };
    if (array !== undefined && array !== null) msg.array = array;
    if (target !== undefined && target !== null) msg.target = target;
    if (graph !== undefined && graph !== null) msg.graph = graph;
    if (start !== undefined && start !== null) msg.start = start;
    if (tree !== undefined && tree !== null) msg.tree = tree;
    if (key !== undefined && key !== null) msg.key = key;
    if (network !== undefined && network !== null) msg.network = network;
    this.ws.send(JSON.stringify(msg));
  }
}
