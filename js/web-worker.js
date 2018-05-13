// Switch to Worker if SharedWorker is not available

/**
 * Check if function exists
 * @method isAvailable
 * @param  {string}    fnName function name
 * @return {Boolean}
 */
function isAvailable(fnName) {
  return fnName in self;
}

/**
 * Worker Client Class
 */
class WorkerClient {
  constructor(file, handler) {
    if (!file || !handler) throw "Missing Required Arguments";
    this._handler = handler;
    if (isAvailable("SharedWorker")) {
      this.initSharedWorker(file);
    } else if (isAvailable("Worker")) {
      this.initWorker(file);
    } else {
      alert("Web Workers Not Supported");
      throw "Web Workers Not Supported";
    }
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

/**
 * Worker Class
 */
class WorkerServer {
  constructor(handler) {
    if (!handler) throw "Missing Required Arguments";
    this._handler = handler;
    this._ports = [];
    if (isAvailable("onconnect")) {
      this.initSharedWorker();
    } else if (isAvailable("onmessage")) {
      this.initWorker();
    }
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
