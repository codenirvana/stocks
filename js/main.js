'use strict';

const ws = new WebSocket('ws://stocks.mnet.website');
ws.onmessage = e => handler(JSON.parse(e.data));

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

class DOM {
  constructor(STOCKS) {
    this.STOCKS = STOCKS;
    this.$main = document.getElementsByTagName('main')[0];
    this.$aside = document.getElementsByTagName('aside')[0];
    this.$stocks = {};
    this.className = {
      STOCK_NAME: 'stock__name',
      STOCK_PRICE: 'stock__price',
      STOCK_CHANGE: 'stock__change',
      STOCK_CHANGE_PROFIT: 'stock__change--profit',
      STOCK_CHANGE_LOSS: 'stock__change--loss',
    };
  }

  update(name) {
    if (this.$stocks[name]) {
      this.$stocks[name] = this.updateStock(name);
    } else {
      this.$stocks[name] = this.newStock(name);
    }
  }

  newStock(name) {
    const $stock = document.createElement("section");
    const $stock_name = document.createElement("div");
    const $stock_price = document.createElement("div");
    const $stock_change = document.createElement("div");
    const $stock_change_span = document.createElement("span");
    $stock.id = name;
    $stock.setAttribute('class', 'stock');
    $stock_name.setAttribute('class', this.className.STOCK_NAME);
    $stock_price.setAttribute('class', this.className.STOCK_PRICE);
    $stock_change.setAttribute('class', this.className.STOCK_CHANGE);
    $stock_change.appendChild($stock_change_span);
    $stock_name.textContent = name;
    $stock_price.textContent = this.STOCKS[name].price;
    $stock.appendChild($stock_name);
    $stock.appendChild($stock_price);
    $stock.appendChild($stock_change);
    this.$aside.appendChild($stock);
    return $stock;
  }

  updateStock(name) {
    const stock = this.STOCKS[name];
    const $stock = this.$stocks[name];
    const $stock_price = $stock.children[1];
    const $stock_change = $stock.children[2].children[0];
    $stock_price.textContent = stock.price;
    $stock_change.textContent = stock.change + "%";
    const className = $stock_change.className;
    if (stock.change > 0 && className != this.className.STOCK_CHANGE_PROFIT) {
      $stock_change.className = this.className.STOCK_CHANGE_PROFIT;
    } else if (stock.change < 0 && className != this.className.STOCK_CHANGE_LOSS) {
      $stock_change.className = this.className.STOCK_CHANGE_LOSS;
    }
    return $stock;
  }

}

const STOCKS = {};
const DATASETS = {};
const VIEW = new DOM(STOCKS);

function handler(data) {
  data
    .map(updateStock)
    .map(updateDataSet)
    .map(updateView)
}

function updateStock([name, price]) {
  const calcChange = (prev, curr) => ((curr-prev)/prev * 100).toFixed(2);
  const prev = STOCKS[name];
  price = price.toFixed(2);
  STOCKS[name] = {
    price,
    change: prev ? calcChange(prev.price, price) : 0,
    high: prev ? Math.max(price, prev.high) : price,
    low: prev ? Math.min(price, prev.low) : price,
    updatedAt: new Date()
  };
  return arguments[0];
}

function updateDataSet([name, price]) {
  const data = {
    price: price.toFixed(2),
    time: new Date()
  };
  if (DATASETS[name]) {
    DATASETS[name].add(data);
  } else {
    DATASETS[name] = new DataSet(data);
  }
  return arguments[0];
}

function updateView([name]) {
  VIEW.update(name);
  return arguments[0];
}
