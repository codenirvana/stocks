'use strict';

class DataSet {
  constructor(data) {
    this._data = data ? [data] : [];
    this._size = this._data.length;
    this._MAX = 30;
  }

  add(data) {
    this._data.push(data);
    if (this._size >= this._MAX) {
      this._data.shift();
    } else {
      this._size++;
    }
  }

  get data() {
    return this._data;
  }
}

class Stocks {
  constructor() {
    this._stocks = {}
    this._datasets = {}
  }

  calcChange(prev, curr) {
    return ((curr-prev)/prev * 100).toFixed(2);
  }

  update([name, price]) {
    const prev = this._stocks[name];
    price = price.toFixed(2);
    this._stocks[name] = {
      price,
      change: prev ? this.calcChange(prev.price, price) : 0,
      high: prev ? Math.max(price, prev.high) : price,
      low: prev ? Math.min(price, prev.low) : price,
      updatedAt: (new Date()).getTime()
    };
    this.updateDataSet(name, price);
    return {
      name,
      data: this._stocks[name]
    };
  }

  updateDataSet(name, price) {
    const data = {
      price,
      time: (new Date()).getTime()
    };
    if (this._datasets[name]) {
      this._datasets[name].add(data);
    } else {
      this._datasets[name] = new DataSet(data);
    }
  }

  getDataSet(name) {
    return this._datasets[name] ? this._datasets[name].data : null;
  }

  get stocks() {
    return this._stocks;
  }
}
