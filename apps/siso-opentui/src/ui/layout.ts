export function fit(value: unknown, width: number) {
  const raw = String(value ?? "").replace(/\s+/g, " ").trimEnd();
  if (raw.length <= width) return raw + " ".repeat(Math.max(0, width - raw.length));
  return raw.slice(0, Math.max(0, width - 1)) + "…";
}

export function line(width: number, char = "─") {
  return char.repeat(Math.max(0, width));
}

export function wrapText(text: string, width: number) {
  const rows: string[] = [];
  let current = "";
  for (const word of String(text ?? "").split(/\s+/)) {
    if ((current + " " + word).trim().length > width) {
      rows.push(fit(current, width));
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) rows.push(fit(current, width));
  return rows;
}

export function sanitizeChildId(id: string) {
  return id.replace(/siso-child-[a-z0-9-]+/i, "child-agent");
}

export function centerText(text: string, width: number) {
  const value = String(text ?? "");
  const left = Math.max(0, Math.floor((width - value.length) / 2));
  return fit(`${" ".repeat(left)}${value}`, width);
}

export function pill(label: string, width = label.length + 4) {
  return fit(` ${label} `, width);
}

export function card(title: string, rows: string[], width: number, options: { selected?: boolean } = {}) {
  const top = `╭─ ${title} ${line(Math.max(0, width - title.length - 5))}╮`;
  const body = rows.map((row) => `│ ${fit(row, width - 4)} │`);
  const bottom = `╰${line(width - 2)}╯`;
  return [top, ...body, bottom];
}

export function twoColumn(leftRows: string[], rightRows: string[], width: number) {
  const gap = 3;
  const leftWidth = Math.max(26, Math.floor((width - gap) * 0.38));
  const rightWidth = Math.max(30, width - gap - leftWidth);
  const rows = Math.max(leftRows.length, rightRows.length);
  return Array.from({ length: rows }, (_, index) => `${fit(leftRows[index] ?? "", leftWidth)}${" ".repeat(gap)}${fit(rightRows[index] ?? "", rightWidth)}`);
}
