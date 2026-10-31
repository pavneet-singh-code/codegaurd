// Escapes a CSV cell and neutralises spreadsheet formula injection (=, +, -, @).
function cell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const toCsv = (rows) => rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
module.exports = { toCsv, cell };
