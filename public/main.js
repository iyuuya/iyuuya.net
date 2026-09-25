import {
  commandText,
  moveTarget,
  neighbor,
  selectedIndexes,
  statusText,
  toggleMode,
} from "./vim.js";

const prevent = (event) => event.preventDefault();
document.addEventListener("selectstart", prevent, true);
document.addEventListener("dragstart", prevent, true);
document.addEventListener("contextmenu", prevent, true);

const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
const names = ["main"];
const panes = [...document.querySelectorAll(".pane")];
const cursors = panes.map(() => 0);
const aimX = panes.map(() => 0);
let active = 0;
let mode = "normal";
let anchor = null;
let prefix = false;

const status = document.querySelector("#status");
const command = document.querySelector("#command");
const block = document.createElement("div");
const regions = document.createElement("div");
block.className = "block";
regions.className = "regions";

function collect(pane) {
  const origin = pane.getBoundingClientRect();
  const style = getComputedStyle(pane);
  const borderLeft = parseFloat(style.borderLeftWidth) || 0;
  const borderTop = parseFloat(style.borderTopWidth) || 0;
  const boxes = [];
  const walker = document.createTreeWalker(pane, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.classList.contains("block") || node.classList.contains("region") || node.classList.contains("regions")) {
          return NodeFilter.FILTER_REJECT;
        }
        if (node.tagName === "IMG") return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP;
      }
      if ([...node.textContent].every((char) => char === "\n" || char === "\r" || char === "\t")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeType === Node.ELEMENT_NODE) {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        boxes.push(toBox(rect, origin, borderLeft, borderTop, "image"));
      }
      continue;
    }

    let index = 0;
    for (const { segment } of segmenter.segment(node.textContent)) {
      const next = index + segment.length;
      if (segment !== " " && segment.trim() === "") {
        index = next;
        continue;
      }
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, next);
      const rect = range.getBoundingClientRect();
      index = next;
      if (rect.width === 0 || rect.height === 0) continue;
      boxes.push(toBox(rect, origin, borderLeft, borderTop, "text"));
    }
  }
  return boxes;
}

function toBox(rect, origin, borderLeft, borderTop, kind) {
  return {
    x: rect.left - origin.left - borderLeft,
    y: rect.top - origin.top - borderTop,
    width: rect.width,
    height: rect.height,
    kind,
  };
}

function place(element, box) {
  element.style.left = `${box.x}px`;
  element.style.top = `${box.y}px`;
  element.style.width = `${box.width}px`;
  element.style.height = `${box.height}px`;
}

function leaveVisual() {
  mode = "normal";
  anchor = null;
}

function render() {
  panes.forEach((pane, index) => pane.classList.toggle("is-active", index === active));
  const pane = panes[active];
  const boxes = collect(pane);
  pane.append(regions, block);

  if (boxes.length === 0) {
    cursors[active] = 0;
    block.hidden = true;
    regions.replaceChildren();
  } else {
    cursors[active] = Math.min(cursors[active], boxes.length - 1);
    const cursor = cursors[active];
    const current = boxes[cursor];
    block.hidden = false;
    block.classList.toggle("is-image", current.kind === "image");
    place(block, current);

    const marks = selectedIndexes(mode, anchor, cursor, boxes).map((index) => {
      const mark = document.createElement("div");
      mark.className = "region";
      place(mark, boxes[index]);
      return mark;
    });
    regions.replaceChildren(...marks);
  }

  status.textContent = statusText(names, active);
  command.textContent = commandText(mode, prefix);
}

function onKey(event) {
  if (event.key === "Escape") {
    prefix = false;
    leaveVisual();
    return true;
  }

  if (!event.repeat && event.ctrlKey && event.key.toLowerCase() === "b") {
    prefix = true;
    return true;
  }

  const moveKeys = event.key === "h" || event.key === "j" || event.key === "k" || event.key === "l";
  if (prefix) {
    prefix = false;
    if (moveKeys) {
      const next = neighbor(active, panes.length, event.key);
      if (next !== active) {
        active = next;
        leaveVisual();
      }
    }
    return true;
  }

  if (!event.repeat && event.ctrlKey && event.key.toLowerCase() === "v") {
    ({ mode, anchor } = toggleMode({ mode, anchor, cursor: cursors[active] }, "visual-block"));
    return true;
  }
  if (!event.repeat && event.key === "V") {
    ({ mode, anchor } = toggleMode({ mode, anchor, cursor: cursors[active] }, "visual-line"));
    return true;
  }
  if (!event.repeat && event.key === "v") {
    ({ mode, anchor } = toggleMode({ mode, anchor, cursor: cursors[active] }, "visual"));
    return true;
  }

  if (moveKeys) {
    const boxes = collect(panes[active]);
    const next = moveTarget(cursors[active], boxes, event.key, aimX[active]);
    if (event.key === "h" || event.key === "l") aimX[active] = boxes[next]?.x ?? aimX[active];
    cursors[active] = next;
    return true;
  }

  return false;
}

window.addEventListener("keydown", (event) => {
  if (!onKey(event)) return;
  event.preventDefault();
  render();
});
window.addEventListener("resize", render);
render();
document.fonts.ready.then(render);
