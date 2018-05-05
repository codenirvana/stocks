const ws = new WebSocket('ws://stocks.mnet.website');
ws.onmessage = e => {
  console.log("WORKER: " + e.data);
  self.postMessage(e.data);
}
