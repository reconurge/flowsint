import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const dragHandleKey = new PluginKey("dragHandle");

function findBlockAt(
  view: any,
  y: number,
): { pos: number; dom: HTMLElement } | null {
  const editorRect = view.dom.getBoundingClientRect();
  const paddingLeft = parseFloat(getComputedStyle(view.dom).paddingLeft) || 0;
  const coords = { left: editorRect.left + paddingLeft + 1, top: y };
  const posInfo = view.posAtCoords(coords);
  if (!posInfo) return null;

  const $pos = view.state.doc.resolve(posInfo.pos);

  const wrapperTypes = new Set([
    "bulletList", "orderedList", "taskList",
  ]);

  for (let d = $pos.depth; d >= 1; d--) {
    const node = $pos.node(d);
    if (!node.isBlock) continue;
    if (d === 1 && $pos.before(1) === 0) continue;
    if (wrapperTypes.has(node.type.name)) continue;
    if (node.isTextblock && d > 1) {
      const parent = $pos.node(d - 1);
      if (parent.type.name === "listItem" || parent.type.name === "taskItem") {
        continue;
      }
    }
    const pos = $pos.before(d);
    const dom = view.nodeDOM(pos);
    if (dom instanceof HTMLElement) {
      return { pos, dom };
    }
  }
  return null;
}

export const DragHandle = Extension.create({
  name: "dragHandle",

  addProseMirrorPlugins() {
    const handle = document.createElement("div");
    handle.className = "flowsint-drag-handle";
    handle.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="4" cy="2" r="1.5"/><circle cx="10" cy="2" r="1.5"/><circle cx="4" cy="7" r="1.5"/><circle cx="10" cy="7" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="10" cy="12" r="1.5"/></svg>`;

    const indicator = document.createElement("div");
    indicator.className = "flowsint-drop-indicator";

    let currentBlockPos: number | null = null;
    let dragging: { pos: number; ghost: HTMLElement } | null = null;
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;

    return [
      new Plugin({
        key: dragHandleKey,
        view(view) {
          const wrapper = view.dom.parentElement!;
          wrapper.style.position = "relative";
          wrapper.appendChild(handle);
          wrapper.appendChild(indicator);

          const positionHandle = (blockDom: HTMLElement, pos: number) => {
            if (hideTimeout) clearTimeout(hideTimeout);
            currentBlockPos = pos;

            const wr = wrapper.getBoundingClientRect();
            const br = blockDom.getBoundingClientRect();

            handle.style.top = `${br.top - wr.top}px`;
            handle.style.left = `${br.left - wr.left - 24}px`;
            handle.style.height = `${br.height}px`;
            handle.style.display = "flex";
          };

          const hideAll = () => {
            handle.style.display = "none";
            indicator.style.display = "none";
            currentBlockPos = null;
          };

          const scheduleHide = () => {
            if (hideTimeout) clearTimeout(hideTimeout);
            hideTimeout = setTimeout(hideAll, 150);
          };

          const cancelHide = () => {
            if (hideTimeout) {
              clearTimeout(hideTimeout);
              hideTimeout = null;
            }
          };

          const onEditorMouseMove = (e: MouseEvent) => {
            if (dragging || e.buttons > 0) return;
            const block = findBlockAt(view, e.clientY);
            if (block) {
              if (block.pos !== currentBlockPos) {
                positionHandle(block.dom, block.pos);
              } else {
                cancelHide();
              }
            } else {
              scheduleHide();
            }
          };

          const onEditorLeave = () => {
            if (!dragging) scheduleHide();
          };
          const onHandleEnter = () => cancelHide();
          const onHandleLeave = () => {
            if (!dragging) scheduleHide();
          };

          const onHandleMouseDown = (e: MouseEvent) => {
            e.preventDefault();
            if (currentBlockPos === null) return;

            const pos = currentBlockPos;
            const blockDom = view.nodeDOM(pos) as HTMLElement;
            if (!blockDom) return;

            const ghost = blockDom.cloneNode(true) as HTMLElement;
            ghost.className = "flowsint-drag-ghost";
            ghost.style.width = `${blockDom.offsetWidth}px`;
            ghost.style.left = `${e.clientX}px`;
            ghost.style.top = `${e.clientY}px`;
            document.body.appendChild(ghost);

            blockDom.classList.add("flowsint-dragging-source");
            dragging = { pos, ghost };
            hideAll();

            const onMouseMove = (ev: MouseEvent) => {
              if (!dragging) return;
              dragging.ghost.style.left = `${ev.clientX}px`;
              dragging.ghost.style.top = `${ev.clientY}px`;

              const block = findBlockAt(view, ev.clientY);
              if (block) {
                const wr = wrapper.getBoundingClientRect();
                const br = block.dom.getBoundingClientRect();
                const above = ev.clientY < br.top + br.height / 2;
                indicator.style.top = `${(above ? br.top : br.bottom) - wr.top - 1}px`;
                indicator.style.left = `${br.left - wr.left}px`;
                indicator.style.width = `${br.width}px`;
                indicator.style.display = "block";
              } else {
                indicator.style.display = "none";
              }
            };

            const onMouseUp = (ev: MouseEvent) => {
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);

              if (!dragging) return;

              dragging.ghost.remove();
              blockDom.classList.remove("flowsint-dragging-source");
              indicator.style.display = "none";

              const originPos = dragging.pos;
              dragging = null;

              const originNode = view.state.doc.nodeAt(originPos);
              if (!originNode) return;

              const target = findBlockAt(view, ev.clientY);
              if (!target) return;

              if (
                originPos < target.pos &&
                originPos + originNode.nodeSize > target.pos
              )
                return;

              const targetNode = view.state.doc.nodeAt(target.pos);
              if (!targetNode) return;

              const targetRect = target.dom.getBoundingClientRect();
              const above = ev.clientY < targetRect.top + targetRect.height / 2;
              const insertPos = above
                ? target.pos
                : target.pos + targetNode.nodeSize;

              if (
                insertPos === originPos ||
                insertPos === originPos + originNode.nodeSize
              )
                return;

              const tr = view.state.tr;
              if (originPos < insertPos) {
                const adjusted = insertPos - originNode.nodeSize;
                tr.delete(originPos, originPos + originNode.nodeSize);
                tr.insert(adjusted, originNode);
              } else {
                tr.insert(insertPos, originNode);
                tr.delete(
                  originPos + originNode.nodeSize,
                  originPos + originNode.nodeSize * 2,
                );
              }
              view.dispatch(tr);
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          };

          view.dom.addEventListener("mousemove", onEditorMouseMove);
          view.dom.addEventListener("mouseleave", onEditorLeave);
          handle.addEventListener("mouseenter", onHandleEnter);
          handle.addEventListener("mouseleave", onHandleLeave);
          handle.addEventListener("mousedown", onHandleMouseDown);

          return {
            destroy() {
              if (hideTimeout) clearTimeout(hideTimeout);
              view.dom.removeEventListener("mousemove", onEditorMouseMove);
              view.dom.removeEventListener("mouseleave", onEditorLeave);
              handle.removeEventListener("mouseenter", onHandleEnter);
              handle.removeEventListener("mouseleave", onHandleLeave);
              handle.removeEventListener("mousedown", onHandleMouseDown);
              handle.remove();
              indicator.remove();
              if (dragging) {
                dragging.ghost.remove();
                dragging = null;
              }
            },
          };
        },
      }),
    ];
  },
});
