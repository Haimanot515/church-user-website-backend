// Escape user-supplied text before interpolating it into HTML (emails etc.).
const MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => MAP[ch]);

// Escape, then keep line breaks readable in HTML email bodies.
const escapeHtmlWithBreaks = (value) => escapeHtml(value).replace(/\r?\n/g, "<br />");

module.exports = { escapeHtml, escapeHtmlWithBreaks };
