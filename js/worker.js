'use strict';

importScripts('stocks.js');
importScripts('web-worker.js');

const handler = {
  init: port => {
    worker.postMessage(port, "init", STOCKS.stocks)
  },
  getDataSet: (port, name) => {
    const data = {
      name,
      dataset: STOCKS.getDataSet(name)
    };
    worker.postMessage(port, "dataset", data);
  }
};

const STOCKS = new Stocks();
const WS = new WebSocket('ws://stocks.mnet.website');
const worker = new WorkerServer(handler);

WS.onmessage = e => {
  const data = JSON.parse(e.data);
  const updates = data.map(d => STOCKS.update(d));
  worker.broadcast("update", updates);
};
