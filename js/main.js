'use strict';

let STOCKS = {};
const worker = new SharedWorker('js/worker.js');
worker.port.onmessage = ({data: {type, data}}) => handler[type](data);
worker.onerror = err => worker.port.close();
worker.port.start();

const handler = {
  init: stocks => {
    STOCKS = stocks;
    initView();
  },
  update: updates => {
    updates.map(({name, data}) => STOCKS[name] = data);
    updates.map(({name}) => updateView(name));
  },
  dataset: dataset => {
    loadChart(dataset);
    console.log("--->", dataset);
  }
};

function getDataSet(name) {
  worker.port.postMessage({
    type: "getDataSet",
    data: name
  });
}

window.onbeforeunload = () => worker.port.postMessage({type:'close'});

/***** VIEW *****/
const $main = document.getElementsByTagName('main')[0];
const $aside = document.getElementsByTagName('aside')[0];
const $stocks = {};

function fadeOut(el) {
  el.style.opacity = 1;

  (function fade() {
    if ((el.style.opacity -= .1) < 0) {
      el.style.display = "none";
    } else {
      requestAnimationFrame(fade);
    }
  })();
}

function fadeIn(el, display) {
  el.style.opacity = 0;
  el.style.display = display || "block";

  (function fade() {
    var val = parseFloat(el.style.opacity);
    if (!((val += .1) > 1)) {
      el.style.opacity = val;
      requestAnimationFrame(fade);
    }
  })();
}

function initView() {
  const wait = setInterval(()=> {
    if(Object.keys(STOCKS).length < 3) return;
    fadeOut(document.getElementById("preload"));
    clearInterval(wait);
  }, 200);
  Object.keys(STOCKS).map(updateView);
}

function updateView(name) {
  if ($stocks[name]) {
    updateStock(name);
  } else {
    $stocks[name] = newStock(name);
  }
}

function createElement(type, id, className, content) {
  const $elem = document.createElement(type);
  if (id) $elem.id = id;
  if (className) $elem.setAttribute('class', className);
  if (content) $elem.textContent = content;
  return $elem;
}

function appendChilds(elem, childs) {
  childs.map(c => elem.appendChild(c));
}

function newStock(name) {
  const $stock = createElement('section', name, 'stock');
  const $stock_name = createElement('div', null, 'stock__name', name);
  const $stock_price = createElement('div', null, 'stock__price', STOCKS[name].price);
  const $stock_change = createElement('div', null, 'stock__change');
  const $stock_change_span = createElement('span');
  $stock_change.appendChild($stock_change_span);
  $stock.onclick = function () { getDataSet(this.id) };
  appendChilds($stock, [$stock_name, $stock_price, $stock_change]);
  $aside.appendChild($stock);
  fadeIn($stock, "grid");
  return $stock;
}

function updateStock(name) {
  const stock = STOCKS[name];
  const $stock = $stocks[name];
  const $stock_price = $stock.children[1];
  const $stock_change = $stock.children[2].children[0];
  const currClass = $stock_change.className;
  $stock_price.textContent = stock.price;
  $stock_change.textContent = stock.change + "%";
  if (stock.change > 0 && currClass != 'stock__change--profit') {
    $stock_change.className = 'stock__change--profit';
  } else if (stock.change < 0 && currClass != 'stock__change--loss') {
    $stock_change.className = 'stock__change--loss';
  }
  return $stock;
}

function loadChart(data) {
  d3.select("svg").selectAll("*").remove();

  var svg = d3.select("svg"),
    MARGINS = {
      top: 20,
      right: 20,
      bottom: 30,
      left: 50
    },
    WIDTH = +svg.attr("width") - MARGINS.left - MARGINS.right,
    HEIGHT = +svg.attr("height") - MARGINS.top - MARGINS.bottom,
    g = svg.append("g").attr("transform", "translate(" + MARGINS.left + "," + MARGINS.top + ")"),
    x = d3.scaleTime()
          .range([MARGINS.left, WIDTH - MARGINS.right])
          .domain(d3.extent(data, d => d.time)),
    y = d3.scaleLinear()
          .range([HEIGHT - MARGINS.top, MARGINS.bottom])
          .domain(d3.extent(data, d => +d.price));

  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", "translate(0," + HEIGHT + ")")
    .call(d3.axisBottom(x))
    .select(".domain")
    .remove();

  g.append("g")
   .attr("class", "y-axis")
   .call(d3.axisLeft(y));

  var line = d3.line()
               .x(d => x(d.time))
               .y(d => y(d.price))
               .curve(d3.curveStepAfter);

  g.append("path")
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", line(data));

}
