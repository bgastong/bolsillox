// Gobiernos de Argentina desde 2002, para dividir el grafico del dolar historico.
// end: dia en que asumio el siguiente (null = el actual).
export const GOVERNMENTS = [
  { key: "duhalde", name: "Eduardo Duhalde", short: "Duhalde", start: "2002-01-02", end: "2003-05-25" },
  { key: "nkirchner", name: "Néstor Kirchner", short: "N. Kirchner", start: "2003-05-25", end: "2007-12-10" },
  { key: "cfk1", name: "Cristina Fernández de Kirchner (1.er mandato)", short: "CFK I", start: "2007-12-10", end: "2011-12-10" },
  { key: "cfk2", name: "Cristina Fernández de Kirchner (2.º mandato)", short: "CFK II", start: "2011-12-10", end: "2015-12-10" },
  { key: "macri", name: "Mauricio Macri", short: "Macri", start: "2015-12-10", end: "2019-12-10" },
  { key: "afernandez", name: "Alberto Fernández", short: "A. Fernández", start: "2019-12-10", end: "2023-12-10" },
  { key: "milei", name: "Javier Milei", short: "Milei", start: "2023-12-10", end: null },
];

// Cotizaciones del dolar con historico (claves de argentinadatos: oficial, blue, bolsa).
export const DOLLAR_HISTORY_SOURCES = ["oficial", "blue", "mep"];
