/* Економічна безпека Чехії — інтерактивні елементи сайту */
"use strict";

/* ---------- навігація (мобільне меню) ---------- */
(function () {
  var btn = document.getElementById("navToggle");
  var list = document.getElementById("navLinks");
  if (!btn || !list) return;
  btn.addEventListener("click", function () {
    var open = list.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  list.addEventListener("click", function (e) {
    if (e.target.tagName === "A") { list.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
  });
})();

/* ---------- дані ---------- */
var YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
var N = null;
var DATA = {
  gdp:        [N, N, 221.56, 251.99, 256.79, 251.11, 290.97, 301.83, 345.06, 347.03],
  inflation:  [0.31, 0.68, 2.45, 2.15, 2.85, 3.16, 3.84, 15.1, 10.7, 2.44],
  unemp:      [5.0, 4.0, 2.9, 2.2, 2.0, 2.5, 2.8, 2.2, 2.6, 2.6],
  debt:       [40.0, 36.8, 34.2, 32.1, 30.0, 37.7, 42.0, 44.2, 44.0, N],
  deficit:    [-0.6, 0.7, 1.5, 0.9, 0.3, -5.8, -5.1, -3.2, -3.7, N],
  exports:    [80.56, 79.11, 79.03, 76.94, 73.88, 69.95, 72.73, 76.45, 68.40, 68.87],
  imports:    [74.62, 71.48, 71.51, 71.00, 67.89, 63.20, 69.77, 75.47, 63.49, 62.62],
  ca:         [0.45, 1.76, 1.35, 0.45, 0.36, 1.78, -2.05, -4.52, 0.11, 1.74],
  savings:    [25.66, 24.76, 25.73, 25.58, 25.75, 25.86, 28.53, 27.28, 28.81, 28.87],
  netImport:  [31.62, 31.33, 31.87, 32.40, 32.93, N, N, N, N, N],
  renew:      [N, N, 14.5, 14.7, 15.9, 17.0, 17.2, N, N, N],
  cereal:     [58.81, 63.17, 54.98, 52.00, 54.01, 60.43, 61.13, 59.30, 60.70, 57.51],
  life:       [78.58, 79.03, 78.98, 79.03, 79.23, 78.23, 77.22, 78.93, 79.83, 79.98]
};
/* похідні показники */
DATA.openness = DATA.exports.map(function (v, i) { return v == null || DATA.imports[i] == null ? N : v + DATA.imports[i]; });
DATA.coverage = DATA.exports.map(function (v, i) { return v == null || !DATA.imports[i] ? N : v / DATA.imports[i]; });
DATA.ownShare = DATA.netImport.map(function (v) { return v == null ? N : 100 - v; });

/* ---------- допоміжні функції ---------- */
function fmt(v, d) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return v.toFixed(d === undefined ? 1 : d).replace(".", ",");
}
function lastIdx(arr) {
  for (var i = arr.length - 1; i >= 0; i--) if (arr[i] !== null && arr[i] !== undefined) return i;
  return -1;
}
function niceScale(min, max, ticks) {
  if (min === max) { min -= 1; max += 1; }
  var span = max - min, step0 = span / (ticks || 5);
  var mag = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10));
  var norm = step0 / mag, step;
  if (norm < 1.5) step = 1; else if (norm < 3) step = 2; else if (norm < 7) step = 5; else step = 10;
  step *= mag;
  var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  var list = [];
  for (var v = lo; v <= hi + step / 2; v += step) list.push(Math.round(v / step) * step);
  return { min: lo, max: hi, list: list, step: step };
}
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

/* ---------- діаграми (SVG без зовнішніх бібліотек) ---------- */
function drawChart(id, o) {
  var host = document.getElementById(id);
  if (!host) return;
  var W = Math.max(host.clientWidth || 560, 280);
  var H = W < 480 ? 250 : 290;
  var m = { t: 14, r: 14, b: 30, l: W < 480 ? 42 : 50 };
  var iw = W - m.l - m.r, ih = H - m.t - m.b;
  var dec = o.decimals === undefined ? 1 : o.decimals;

  var vals = [];
  o.series.forEach(function (s) { s.values.forEach(function (v) { if (v !== null && v !== undefined) vals.push(v); }); });
  (o.ref || []).forEach(function (r) { vals.push(r.y); });
  if (o.band) { vals.push(o.band.from); vals.push(o.band.to); }
  var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
  if (o.type === "bar") { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  if (o.yMin !== undefined) lo = o.yMin;
  if (o.yMax !== undefined) hi = o.yMax;
  var sc = niceScale(lo, hi, 5);
  function Y(v) { return m.t + ih - (v - sc.min) / (sc.max - sc.min) * ih; }
  var n = YEARS.length, slot = iw / n;
  function X(i) { return m.l + slot * (i + 0.5); }

  var s = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(o.title) + '" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Roboto, Arial, sans-serif">';
  /* зона оптимуму */
  if (o.band) {
    var y1 = Y(Math.min(o.band.to, sc.max)), y2 = Y(Math.max(o.band.from, sc.min));
    s += '<rect x="' + m.l + '" y="' + y1 + '" width="' + iw + '" height="' + Math.max(y2 - y1, 1) + '" fill="#34a853" opacity=".13"/>';
    var right = o.band.pos === "right" || o.band.pos === "bottomright";
    var ly = o.band.pos === "bottomright" ? y2 - 5 : y1 + 12;
    s += '<text x="' + (right ? m.l + iw - 4 : m.l + 4) + '" y="' + ly + '" text-anchor="' + (right ? "end" : "start") + '" font-size="11" fill="#1e7a3a">' + esc(o.band.label) + "</text>";
  }
  /* сітка та вісь Y */
  sc.list.forEach(function (t) {
    var y = Y(t);
    s += '<line x1="' + m.l + '" x2="' + (m.l + iw) + '" y1="' + y + '" y2="' + y + '" stroke="' + (t === 0 ? "#9aa5bd" : "#e3e8f2") + '"/>';
    s += '<text x="' + (m.l - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" fill="#5b6478">' + fmt(t, sc.step < 1 ? 1 : 0) + "</text>";
  });
  /* вісь X */
  YEARS.forEach(function (yr, i) {
    if (W < 480 && i % 2 === 1) return;
    s += '<text x="' + X(i) + '" y="' + (H - 9) + '" text-anchor="middle" font-size="11" fill="#5b6478">' + yr + "</text>";
  });
  /* опорні лінії */
  (o.ref || []).forEach(function (r) {
    var y = Y(r.y);
    s += '<line x1="' + m.l + '" x2="' + (m.l + iw) + '" y1="' + y + '" y2="' + y + '" stroke="#d7141a" stroke-dasharray="5 4" stroke-width="1.4"/>';
    s += '<text x="' + (m.l + 4) + '" y="' + (y - 4) + '" font-size="11" fill="#d7141a">' + esc(r.label) + "</text>";
  });
  /* серії */
  var k = o.series.length;
  o.series.forEach(function (ser, si) {
    var color = ser.color;
    if (o.type === "bar") {
      var bw = Math.min(slot * 0.7 / k, 34), gx = (slot - bw * k) / 2;
      ser.values.forEach(function (v, i) {
        if (v === null || v === undefined) return;
        var x = m.l + slot * i + gx + bw * si, y0 = Y(0), y = Y(v);
        var fill = (o.negColor && v < 0) ? o.negColor : color;
        s += '<rect x="' + x + '" y="' + Math.min(y, y0) + '" width="' + bw + '" height="' + Math.max(Math.abs(y0 - y), 1) + '" rx="2" fill="' + fill + '"><title>' + YEARS[i] + ": " + fmt(v, dec) + " " + esc(o.unit || "") + "</title></rect>";
      });
    } else {
      var d = "", pen = false;
      ser.values.forEach(function (v, i) {
        if (v === null || v === undefined) { pen = false; return; }
        d += (pen ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1) + " ";
        pen = true;
      });
      s += '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
      ser.values.forEach(function (v, i) {
        if (v === null || v === undefined) return;
        s += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="3.6" fill="#fff" stroke="' + color + '" stroke-width="2"><title>' + esc(ser.name) + ", " + YEARS[i] + ": " + fmt(v, dec) + " " + esc(o.unit || "") + "</title></circle>";
      });
    }
  });
  s += "</svg>";
  var legend = "";
  if (o.series.length > 1 || o.legend) {
    legend = '<div class="legend">' + o.series.map(function (x) { return '<span><i style="background:' + x.color + '"></i>' + esc(x.name) + "</span>"; }).join("") + "</div>";
  }
  host.innerHTML = s + legend;
}

var BLUE = "#1d5fc4", RED = "#d7141a", GREEN = "#1e9e58", ORANGE = "#e8890c", GREY = "#6b7a99";
var CHARTS = [
  { id: "ch-gdp", type: "bar", title: "ВВП", unit: "млрд дол.", decimals: 1, series: [{ name: "ВВП, млрд дол. США", values: DATA.gdp, color: BLUE }] },
  { id: "ch-infl", type: "line", title: "Інфляція", unit: "%", decimals: 1, band: { from: 2, to: 3, label: "оптимум 2–3 %" }, series: [{ name: "Інфляція, %", values: DATA.inflation, color: RED }] },
  { id: "ch-unemp", type: "line", title: "Безробіття", unit: "%", decimals: 1, yMin: 0, band: { from: 0, to: 5, label: "оптимум до 5 %", pos: "right" }, series: [{ name: "Безробіття, %", values: DATA.unemp, color: BLUE }] },
  { id: "ch-debt", type: "line", title: "Державний борг", unit: "% ВВП", decimals: 1, yMin: 0, yMax: 70, ref: [{ y: 60, label: "критерій ЄС 60 %" }], series: [{ name: "Борг загального уряду, % ВВП", values: DATA.debt, color: ORANGE }] },
  { id: "ch-deficit", type: "bar", title: "Дефіцит бюджету", unit: "% ВВП", decimals: 1, negColor: RED, ref: [{ y: -3, label: "ліміт ЄС –3 %" }], series: [{ name: "Сальдо загального уряду, % ВВП", values: DATA.deficit, color: GREEN }] },
  { id: "ch-trade", type: "line", title: "Експорт та імпорт", unit: "% ВВП", decimals: 1, series: [{ name: "Експорт, % ВВП", values: DATA.exports, color: GREEN }, { name: "Імпорт, % ВВП", values: DATA.imports, color: RED }] },
  { id: "ch-open", type: "line", title: "Відкритість економіки", unit: "% ВВП", decimals: 1, ref: [{ y: 100, label: "поріг абсолютної небезпеки 100 %" }], series: [{ name: "(Експорт + імпорт) / ВВП, %", values: DATA.openness, color: BLUE }] },
  { id: "ch-ca", type: "bar", title: "Сальдо поточного рахунку", unit: "% ВВП", decimals: 1, negColor: RED, band: { from: -1.5, to: 1.5, label: "оптимум ±1,5 %", pos: "bottomright" }, series: [{ name: "Сальдо поточного рахунку, % ВВП", values: DATA.ca, color: BLUE }] },
  { id: "ch-sav", type: "line", title: "Валові заощадження", unit: "% ВНД", decimals: 1, band: { from: 30, to: 35, label: "оптимум 30–35 %", pos: "right" }, yMin: 22, yMax: 36, series: [{ name: "Валові заощадження, % ВНД", values: DATA.savings, color: GREEN }] },
  { id: "ch-energy", type: "line", title: "Енергетика", unit: "%", decimals: 1, yMin: 0, yMax: 100, series: [{ name: "Частка власних джерел, % (2015–2019)", values: DATA.ownShare, color: BLUE }, { name: "Відновлювана енергія, % (2017–2021)", values: DATA.renew, color: GREEN }] },
  { id: "ch-cereal", type: "bar", title: "Урожайність зернових", unit: "ц/га", decimals: 1, series: [{ name: "Урожайність, ц/га", values: DATA.cereal, color: ORANGE }] },
  { id: "ch-life", type: "line", title: "Тривалість життя", unit: "років", decimals: 2, yMin: 76, yMax: 80.5, series: [{ name: "Очікувана тривалість життя, років", values: DATA.life, color: BLUE }] }
];
function drawAll() { CHARTS.forEach(function (c) { drawChart(c.id, c); }); }

/* ---------- таблиця показників ---------- */
var ROWS = [
  { l: "ВВП, млрд дол. США (поточні ціни)", k: "gdp", d: 1 },
  { l: "Інфляція (індекс споживчих цін), %", k: "inflation", d: 1 },
  { l: "Безробіття, % робочої сили", k: "unemp", d: 1 },
  { l: "Борг загального уряду, % ВВП", k: "debt", d: 1 },
  { l: "Сальдо бюджету загального уряду, % ВВП", k: "deficit", d: 1 },
  { l: "Експорт товарів і послуг, % ВВП", k: "exports", d: 1, mark: [8] },
  { l: "Імпорт товарів і послуг, % ВВП", k: "imports", d: 1 },
  { l: "Відкритість економіки, % ВВП", k: "openness", d: 1, mark: [8] },
  { l: "Коефіцієнт покриття експортом імпорту, разів", k: "coverage", d: 2, mark: [8] },
  { l: "Сальдо поточного рахунку, % ВВП", k: "ca", d: 2, mark: [3, 5, 6, 7, 8, 9] },
  { l: "Валові заощадження, % ВНД", k: "savings", d: 1 },
  { l: "Частка власних джерел енергії, %", k: "ownShare", d: 1 },
  { l: "Частка відновлюваної енергії, %", k: "renew", d: 1 },
  { l: "Урожайність зернових, ц/га", k: "cereal", d: 1, mark: [5] },
  { l: "Тривалість життя при народженні, років", k: "life", d: 2 }
];
function buildTable() {
  var host = document.getElementById("dataTable");
  if (!host) return;
  var h = "<thead><tr><th>Показник</th>" + YEARS.map(function (y) { return "<th>" + y + "</th>"; }).join("") + "</tr></thead><tbody>";
  ROWS.forEach(function (r) {
    h += "<tr><td>" + esc(r.l) + "</td>";
    DATA[r.k].forEach(function (v, i) {
      var star = r.mark && r.mark.indexOf(i) !== -1 ? "*" : "";
      h += "<td>" + fmt(v, r.d) + (v === null ? "" : star) + "</td>";
    });
    h += "</tr>";
  });
  host.innerHTML = h + "</tbody>";
}

/* ---------- ключові показники (плитки) ---------- */
function buildStats() {
  var defs = [
    { id: "st-gdp", k: "gdp", d: 1, suf: " млрд $" },
    { id: "st-infl", k: "inflation", d: 1, suf: " %" },
    { id: "st-unemp", k: "unemp", d: 1, suf: " %" },
    { id: "st-debt", k: "debt", d: 1, suf: " % ВВП" }
  ];
  defs.forEach(function (x) {
    var el = document.getElementById(x.id);
    if (!el) return;
    var i = lastIdx(DATA[x.k]);
    el.querySelector(".v").textContent = fmt(DATA[x.k][i], x.d) + x.suf;
    el.querySelector(".y").textContent = YEARS[i] + " р.";
  });
}

/* ---------- запуск ---------- */
function init() {
  buildStats();
  buildTable();
  drawAll();
  var t;
  window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(drawAll, 150); });
}
if (document.getElementById("dataTable")) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
}
if (typeof module !== "undefined") { module.exports = { DATA: DATA, drawChart: drawChart, CHARTS: CHARTS, buildTable: buildTable }; }
