export function moveTarget(index, boxes, key, aimX = boxes[index]?.x ?? 0) {
  const lines = lineGroups(boxes);
  const lineIndex = lines.findIndex((line) => line.some((item) => item.index === index));
  if (lineIndex < 0) return index;
  const line = lines[lineIndex];
  const position = line.findIndex((item) => item.index === index);

  if (key === "h") return position > 0 ? line[position - 1].index : index;
  if (key === "l") return position < line.length - 1 ? line[position + 1].index : index;

  const next = lines[lineIndex + (key === "j" ? 1 : -1)];
  if (!next) return index;
  return closestColumn(next, aimX).index;
}

export function toggleMode(state, next) {
  if (state.mode === next) return { mode: "normal", anchor: null };
  const anchor = state.mode === "normal" ? state.cursor : state.anchor;
  return { mode: next, anchor };
}

export function selectedIndexes(mode, anchor, cursor, boxes) {
  if (mode === "normal" || anchor === null || !boxes[anchor] || !boxes[cursor]) return [];
  if (mode === "visual") {
    const start = Math.min(anchor, cursor);
    const end = Math.max(anchor, cursor);
    return Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
  }

  const anchorBox = boxes[anchor];
  const cursorBox = boxes[cursor];
  const top = Math.min(anchorBox.y, cursorBox.y);
  const bottom = Math.max(anchorBox.y + anchorBox.height, cursorBox.y + cursorBox.height);
  if (mode === "visual-line") {
    return boxes.flatMap((box, index) => (box.y < bottom && box.y + box.height > top ? [index] : []));
  }

  const left = Math.min(anchorBox.x, cursorBox.x);
  const right = Math.max(anchorBox.x + anchorBox.width, cursorBox.x + cursorBox.width);
  return boxes.flatMap((box, index) =>
    box.x < right && box.x + box.width > left && box.y < bottom && box.y + box.height > top ? [index] : [],
  );
}

export function neighbor(index, count, key) {
  if (key === "h") return Math.max(0, index - 1);
  if (key === "l") return Math.min(count - 1, index + 1);
  return index;
}

export function commandText(mode, prefix) {
  if (prefix) return "^B";
  if (mode === "visual") return "-- VISUAL --";
  if (mode === "visual-line") return "-- VISUAL LINE --";
  if (mode === "visual-block") return "-- VISUAL BLOCK --";
  return "";
}

export function statusText(names, active) {
  return names.map((name, index) => `${index}:${name}${index === active ? "*" : ""}`).join("  ");
}

function lineGroups(boxes) {
  const items = boxes
    .map((box, index) => ({ box, index }))
    .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
  const lines = [];
  for (const item of items) {
    const line = lines.at(-1);
    if (!line || item.box.y >= line.top + line.minHeight * 0.55) {
      lines.push({ top: item.box.y, minHeight: item.box.height, items: [item] });
      continue;
    }
    line.minHeight = Math.min(line.minHeight, item.box.height);
    line.items.push(item);
  }
  return lines.map((line) => line.items.sort((a, b) => a.box.x - b.box.x));
}

function closestColumn(line, aimX) {
  return line.reduce((best, item) => {
    const overlap = item.box.x <= aimX && aimX < item.box.x + item.box.width;
    const distance = Math.abs(item.box.x - aimX);
    if (overlap && !best.overlap) return { item, overlap, distance };
    if (overlap === best.overlap && distance < best.distance) return { item, overlap, distance };
    return best;
  }, { item: line[0], overlap: false, distance: Infinity }).item;
}
