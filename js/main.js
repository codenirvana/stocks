{ 'use strict';

let STOCK_SELECTED;
let STOCKS = {};
let CHART = {
  active: [],
  dataset: {}
};

/********** WORKER **********/
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

const worker = new WorkerClient('js/worker.js', handler);
worker.postMessage("init");

/**
 * Post message to Get Stock's DataSet
 * @method getDataSet
 * @param  {string}   name stock name
 */
function getDataSet(name) {
  worker.postMessage("getDataSet", name);
}

/**
 * Update DataSet if update stock is active in chart
 * @method updateDataSet
 * @param  {string}      name stock name
 */
function updateDataSet(name) {
  if (CHART.active.includes(name))
    getDataSet(name);
}

/********** VIEW **********/
const $preload = document.getElementById('preload');
const $main = document.getElementsByTagName('main')[0];
const $aside = document.getElementsByTagName('aside')[0];
const $stocks = {};

/**
 * Create DOM element with provided properties
 * @method createElement
 * @param  {string}      type      element type
 * @param  {string}      id        element id
 * @param  {string}      className element class
 * @param  {string}      content   element text content
 * @return {object}                DOM Object
 */
function createElement(type, id, className, content) {
  const $el = document.createElement(type);
  if (id) $el.id = id;
  if (className) $el.setAttribute('class', className);
  if (content) $el.textContent = content;
  return $el;
}

/**
 * Append multiple childs to parent
 * @method appendChilds
 * @param  {object}     el     parent element
 * @param  {array}     childs array of child elements
 */
function appendChilds(el, childs) {
  childs.map(c => el.appendChild(c));
}

/**
 * Get first element with given class name
 * @method getElementByClassName
 * @param  {string}              className class searching for
 * @return {object}                        dom object
 */
function getElementByClassName(className) {
  const elements = document.getElementsByClassName(className);
  return elements ? elements[0] : null;
}

/**
 * Remove all childs from parent
 * @method removeChilds
 * @param  {object}     el parent dom object
 */
function removeChilds(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/**
 * FadeOut animation
 * @method fadeOut
 * @param  {object} el dom object
 */
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

/**
 * FadeIn animation
 * @method fadeIn
 * @param  {object} el      dom object
 * @param  {string} display display property after fadeIn
 */
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

/**
 * Calculate time since a given timestamp and current time
 * @method timeSince
 * @param  {object}  date date object
 * @return {string}       time since in words
 */
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

/**
 * Generate random color
 * Reference: https://gist.github.com/jdarling/06019d16cb5fd6795edf
 * @method randomColor
 * @return {string}      HEX color
 */
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

/**
 * Update time since every 5 seconds
 */
const scheduler = setInterval(() => {
  if (STOCK_SELECTED) updateContentSummary(STOCK_SELECTED);
}, 5000);

/**
 * Initialize View
 * Show loader until 3 stocks received
 * @method initView
 */
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

/**
 * Update View on stock update
 * @method updateView
 * @param  {string}   name stock name
 */
function updateView(name) {
  if ($stocks[name]) {
    updateStock(name);
  } else {
    $stocks[name] = newStock(name);
  }
  if (STOCK_SELECTED == name) updateContent(name);
}

/**
 * Create new stock entry
 * @method newStock
 * @param  {string} name stock name
 */
function newStock(name) {
  const $stock = createElement('section', name, 'stock');
  const $stock_name = createElement('div', null, 'stock__name', name);
  const $stock_price = createElement('div', null, 'stock__price', STOCKS[name].price);
  const $stock_change = createElement('div', null, 'stock__change');
  const $stock_change_span = createElement('span');
  $stock_change.appendChild($stock_change_span);
  $stock.onclick = function () { stockSelected(this.id); };
  $stock.oncontextmenu = function () {  compareStock(this.id); return false; };
  appendChilds($stock, [$stock_name, $stock_price, $stock_change]);
  $aside.appendChild($stock);
  fadeIn($stock, "grid");
  return $stock;
}

/**
 * Update existing stock
 * @method updateStock
 * @param  {string}    name stock name
 */
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

/**
 * Stock onClick handler
 * Get DataSet of selected stock and update content
 * @method stockSelected
 * @param  {string}      name stock name
 */
function stockSelected(name) {
  const selectedClass = "stock--active";
  if (STOCK_SELECTED) $stocks[STOCK_SELECTED].classList.remove(selectedClass);
  STOCK_SELECTED = name;
  CHART.active = [name];
  $stocks[name].classList.add(selectedClass);
  getDataSet(name);
  updateContent(name);
  updateCompare(name);
}

/**
 * Add stock to compare list
 * Compare upto 3 stock in chart
 * @method compareStock
 * @param  {string}     name stock name
 */
function compareStock(name) {
  if (CHART.active.includes(name)) {
    const index = CHART.active.indexOf(name);
    CHART.active.splice(index, 1);
  }
  if (CHART.active.length == 3) {
    return alert("Max Compare Limit Reached");
  }
  CHART.active.push(name);
  getDataSet(name);
  updateCompare(name);
}

/**
 * Update stock change class based
 * @method updateStockChange
 * @param  {object}          el   stock change dom object
 * @param  {string}          name stock name
 */
function updateStockChange(el, name) {
  const change = STOCKS[name].change;
  const currClass = el.className;
  if (change > 0 && currClass != 'stock__change--profit') {
    el.className = 'stock__change--profit';
  } else if (change < 0 && currClass != 'stock__change--loss') {
    el.className = 'stock__change--loss';
  }
}

/**
 * Update stock content
 * @method updateContent
 * @param  {string}      name stock name
 */
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

/**
 * Update stock time since
 * @method updateContentSummary
 * @param  {string}             name stock name
 */
function updateContentSummary(name) {
  const updatedAt = STOCKS[name].updatedAt;
  const $summary = getElementByClassName("content__details--summary");
  $summary.textContent = timeSince(updatedAt);
}

/**
 * Update stock compare summary
 * @method updateCompare
 * @param  {string}      name stock name
 */
function updateCompare(name) {
  setTimeout(() => {
    const $compare = getElementByClassName('analytics__container--compare');
    const $span = createElement('span', null, null, name);
    const color = CHART.dataset[name].color;
    $span.setAttribute("style", `color:${color}; border-bottom: 2px solid ${color};`);
    if (CHART.active.length === 1) removeChilds($compare);
    $compare.appendChild($span);
    fadeIn($span, "inline");
  }, 100);
}

/********** CHART **********/
let chartLoaded = false;

/**
 * Initialize stock chart
 * @method initChart
 */
function initChart() {
  const svg = d3.select("#chart");
  const container = d3.select(svg.node().parentNode);
  const width = parseInt(container.style("width"));
  const aspect = width > 600 ? 2 : 1.5;
  const height = Math.round(width / aspect);
  if (!chartLoaded) {
    chartLoaded = true;
    onChartResize();
  }
  svg.attr("width", width)
     .attr("height", height)
     .attr("viewBox", "0 0 " + width + " " + height);
}

/**
 * Responsive chart on resize
 * @method onChartResize
 */
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

/**
 * Draw chart with proved dataset
 * @method drawChart
 */
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

/**
 * Get chart domain based on active stocks
 * @method chartDomain
 * @return {object}    d3 domain
 */
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
