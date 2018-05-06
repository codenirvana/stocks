'use strict';

importScripts('stocks.js');

const PORTS = [];
const STOCKS = new Stocks();
const WS = new WebSocket('ws://stocks.mnet.website');

onconnect = e => {
    const port = e.ports[0];
    PORTS.push(port);
    port.onmessage = ({data: {type, data}}) => handler[type](port, data);
    port.start();
    initClient(port);
};

WS.onmessage = e => {
  const data = JSON.parse(e.data);
  const updates = data.map(d => STOCKS.update(d));
  broadcast("update", updates);
};

function initClient(port) {
  port.postMessage({
    type: "init",
    data: STOCKS.stocks
  });
}

const handler = {
  getDataSet: (port, name) => {
    port.postMessage({
      type: "dataset",
      data: {
        name,
        dataset: STOCKS.getDataSet(name)
      }
    });
  },
  close: (port) => PORTS.splice(PORTS.indexOf(port), 1)
}

function broadcast(type, data) {
  PORTS.map(c => c.postMessage({type, data}));
}
