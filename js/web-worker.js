class WorkerClient {
  constructor(file, handler) {
    if (!file || !handler) throw "Missing Required Arguments";
    this.active = true;
    this._handler = handler;
    if (this.isAvailable("SharedWorker")) {
      this.initSharedWorker(file);
    } else if (this.isAvailable("Worker")) {
      this.initWorker(file);
    } else {
      this.active = false;
    }
  }

  isAvailable(fnName) {
    return fnName in window;
  }

  initSharedWorker(file) {
    const worker = this._worker = new SharedWorker(file);
    worker.port.onmessage = ({data: {type, data}}) => {
      this._handler[type](data);
    }
    worker.onerror = err => worker.port.close();
    worker.port.start();
    this.postMessage = (type, data) => worker.port.postMessage({type, data});
    window.onbeforeunload = () => {
      worker.port.postMessage({type:'CLOSE_PORT'});
    }
  }

  initWorker(file) {
    const worker = this._worker = new Worker(file);
    worker.onmessage = ({data: {type, data}}) => this._handler[type](data);
    worker.onerror = err => worker.terminate();
    this.postMessage = (type, data) => worker.postMessage({type, data});
  }
}

class WorkerServer {
  constructor(handler) {
    if (!handler) throw "Missing Required Arguments";
    this._handler = handler;
    this._ports = [];
    if (this.isAvailable("onconnect")) {
      this.initSharedWorker();
    } else if (this.isAvailable("onmessage")) {
      this.initWorker();
    }
  }

  isAvailable(fnName) {
    return fnName in self;
  }

  closePort(port) {
    this._ports.splice(this._ports.indexOf(port), 1);
  }

  initSharedWorker() {
    self.onconnect = e => {
      const port = e.ports[0];
      this._ports.push(port);
      port.onmessage = ({data: {type, data}}) => {
        if (type === "CLOSE_PORT") return this.closePort(port);
        this._handler[type](port, data);
      };
      port.start();
    };
    this.postMessage = (port, type, data) => port.postMessage({type, data});
    this.broadcast = (type, data) => this._ports.map(c => c.postMessage({type, data}));
  }

  initWorker() {
    self.onmessage = ({data: {type, data}}) => {
      this._handler[type](null, data);
    }
    this.postMessage = (_, type, data) => self.postMessage({type, data});
    this.broadcast = (type, data) => self.postMessage({type, data});
  }
}
