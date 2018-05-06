{ 'use strict';

let STOCK_SELECTED;
let STOCKS = {};
let CHART = {
  active: [],
  dataset: {}
};

/********** WORKER **********/
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
    updates.map(({name}) => updateDataSet(name));
  },
  dataset: ({name, dataset}) => {
    if (!CHART.dataset[name]) {
      CHART.dataset[name] = {
        color: randomColor(),
        data: []
      }
    }
    CHART.dataset[name].data = dataset;
    drawChart();
  }
};

function getDataSet(name) {
  worker.port.postMessage({
    type: "getDataSet",
    data: name
  });
}

function updateDataSet(name) {
  if (CHART.active.includes(name))
    getDataSet(name);
}

window.onbeforeunload = () => worker.port.postMessage({type:'close'});

/********** VIEW **********/
const $preload = document.getElementById("preload");
const $main = document.getElementsByTagName('main')[0];
const $aside = document.getElementsByTagName('aside')[0];
const $stocks = {};

function createElement(type, id, className, content) {
  const $el = document.createElement(type);
  if (id) $el.id = id;
  if (className) $el.setAttribute('class', className);
  if (content) $el.textContent = content;
  return $el;
}

function appendChilds(el, childs) {
  childs.map(c => el.appendChild(c));
}

function getElementByClassName(className) {
  const elements = document.getElementsByClassName(className);
  return elements ? elements[0] : null;
}

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

function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const intervals = {
    year : 31536000,
    month: 2592000,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  }
  for (let i in intervals) {
    const calc = Math.floor(seconds / intervals[i]);
    if (calc > 1) return `${calc} ${i}s ago`;
    else if (calc == 1) return `${calc} ${i} ago`;
  }
  return `just now`;
}

// https://gist.github.com/jdarling/06019d16cb5fd6795edf
const randomColor = (() => {
  const golden_ratio_conjugate = 0.618033988749895;
  let h = Math.random();
  const hslToRgb =  (h, s, l) => {
    let r, g, b;
    if (s == 0) {
      r = g = b = l;
    } else {
      function hue2rgb(p, q, t) {
        if(t < 0) t += 1;
        if(t > 1) t -= 1;
        if(t < 1/6) return p + (q - p) * 6 * t;
        if(t < 1/2) return q;
        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return '#' + Math.round(r * 255).toString(16)
      + Math.round(g * 255).toString(16) + Math.round(b * 255).toString(16);
  };

  return () => {
    h += golden_ratio_conjugate;
    h %= 1;
    return hslToRgb(h, 0.5, 0.60);
  };
})();

const scheduler = setInterval(() => {
  if (STOCK_SELECTED) updateContentSummary(STOCK_SELECTED);
}, 5000);

function initView() {
  const wait = setInterval(()=> {
    const keys = Object.keys(STOCKS);
    if(keys.length < 3) return;
    clearInterval(wait);
    stockSelected(keys[0]);
    fadeOut($preload);
  }, 300);
  Object.keys(STOCKS).map(updateView);
}

function updateView(name) {
  if ($stocks[name]) {
    updateStock(name);
  } else {
    $stocks[name] = newStock(name);
  }
  if (STOCK_SELECTED == name) updateContent(name);
}

function newStock(name) {
  const $stock = createElement('section', name, 'stock');
  const $stock_name = createElement('div', null, 'stock__name', name);
  const $stock_price = createElement('div', null, 'stock__price', STOCKS[name].price);
  const $stock_change = createElement('div', null, 'stock__change');
  const $stock_change_span = createElement('span');
  $stock_change.appendChild($stock_change_span);
  $stock.onclick = function () { stockSelected(this.id); };
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
  $stock_price.textContent = stock.price;
  $stock_change.textContent = stock.change + "%";
  updateStockChange($stock_change, name);
  return $stock;
}

function stockSelected(name) {
  const selectedClass = "stock--active";
  if (STOCK_SELECTED) $stocks[STOCK_SELECTED].classList.remove(selectedClass);
  STOCK_SELECTED = name;
  CHART.active = [name];
  $stocks[name].classList.add(selectedClass);
  updateContent(name);
  getDataSet(name);
}

function updateStockChange(el, name) {
  const change = STOCKS[name].change;
  const currClass = el.className;
  if (change > 0 && currClass != 'stock__change--profit') {
    el.className = 'stock__change--profit';
  } else if (change < 0 && currClass != 'stock__change--loss') {
    el.className = 'stock__change--loss';
  }
}

function updateContent(name) {
  const stock = STOCKS[name];
  const $header = getElementByClassName("content__header");
  const $high = getElementByClassName("content__details--high");
  const $low = getElementByClassName("content__details--low");

  $header.textContent = name;
  $high.textContent = stock.high;
  $low.textContent = stock.low;
  updateContentSummary(name);
}

function updateContentSummary(name) {
  const updatedAt = STOCKS[name].updatedAt;
  const $summary = getElementByClassName("content__details--summary");
  $summary.textContent = timeSince(updatedAt);
}

/********** CHART **********/
let chartLoaded = false;

function initChart() {
  const svg = d3.select("#chart");
  const container = d3.select(svg.node().parentNode);
  const width = parseInt(container.style("width"));
  let aspect;
  if (!chartLoaded) {
    chartLoaded = true;
    aspect = 2;
    onChartResize();
  } else {
    aspect = width / parseInt(svg.style("height"));
  }
  const height = Math.round(width / aspect);
  svg.attr("width", width)
     .attr("height", height)
     .attr("viewBox", "0 0 " + width + " " + height);
}

function onChartResize() {
  let timeout;
  window.onresize = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      initChart();
      drawChart();
    }, 300);
  };
}

function drawChart() {
  const svg = d3.select("#chart");
  svg.selectAll("*").remove();
  if (!chartLoaded) initChart();

  const DOMAIN = chartDomain();
  const MARGINS = {
    top: 20,
    right: 20,
    bottom: 30,
    left: 30
  };
  const WIDTH = +svg.attr("width") - MARGINS.left - MARGINS.right;
  const HEIGHT = +svg.attr("height") - MARGINS.top - MARGINS.bottom;
  const g = svg.append("g").attr("transform", "translate(" + MARGINS.left + "," + MARGINS.top + ")");
  const line = d3.line();
  const x = d3.scaleTime()
              .range([MARGINS.left, WIDTH - MARGINS.right])
              .domain(d3.extent(DOMAIN.time));
  const y = d3.scaleLinear()
              .range([HEIGHT - MARGINS.top, MARGINS.bottom])
              .domain(d3.extent(DOMAIN.price));

  g.append("g")
   .attr("class", "x-axis")
   .attr("transform", "translate(0," + HEIGHT + ")")
   .call(d3.axisBottom(x))
   .select(".domain")
   .remove();

  g.append("g")
   .attr("class", "y-axis")
   .call(d3.axisLeft(y));

  line.x(d => x(d.time))
      .y(d => y(d.price))
      .curve(d3.curveStepAfter);

  CHART.active.map(name => {
    const dataset = CHART.dataset[name];
    if (!dataset) return;
    g.append("path")
     .attr("fill", "none")
     .attr("stroke", dataset.color)
     .attr("stroke-width", 1.5)
     .attr("d", line(dataset.data));
  });
}

function chartDomain() {
  const DOMAIN = {
    price: [],
    time: []
  };
  CHART.active.map(name => {
    const dataset = CHART.dataset[name];
    if (!dataset) return;
    dataset.data.map(({price, time}) => {
      DOMAIN.price.push(+price);
      DOMAIN.time.push(time);
    })
  });
  return DOMAIN;
}

} // IIFE
