const pad = (n) => String(n).padStart(2, "0");

const parseIsoDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
};

const toIsoDate = (date) => date.toISOString().slice(0, 10);

const todayInAddis = () => {
  const shifted = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return parseIsoDate(shifted.toISOString().slice(0, 10));
};

const toEthiopian = (date) => {
  const jdn = Math.floor(date.getTime() / 86400000) + 2440588;
  const r = (jdn - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor((jdn - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { day, month, year, label: `${pad(day)}/${pad(month)}/${year}` };
};

module.exports = { parseIsoDate, toIsoDate, todayInAddis, toEthiopian };
