import { useEffect, useRef, useState, useCallback } from "react";
import {
  Pen, Square, Circle, Minus, ArrowRight, Type, Eraser,
  Undo2, Trash2, Download,
} from "lucide-react";

const LOGICAL_W = 1600;
const LOGICAL_H = 900;

const PALETTE = [
  "#ffffff", "#f87171", "#fb923c", "#facc15",
  "#4ade80", "#60a5fa", "#a78bfa", "#f472b6", "#000000",
];

const STROKE_WIDTHS = [2, 4, 8, 16];

const ERASER_R = 20;

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function toLogical(e, canvas) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * LOGICAL_W,
    y: ((e.clientY - r.top) / r.height) * LOGICAL_H,
  };
}

function renderEl(ctx, el) {
  ctx.save();
  ctx.strokeStyle = el.color || "#fff";
  ctx.fillStyle = el.color || "#fff";
  ctx.lineWidth = el.width || 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (el.type) {
    case "pen":
      if (el.points && el.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      }
      break;

    case "rect":
      ctx.strokeRect(el.x, el.y, el.w, el.h);
      break;

    case "ellipse":
      ctx.beginPath();
      ctx.ellipse(
        el.x + el.w / 2, el.y + el.h / 2,
        Math.abs(el.w / 2), Math.abs(el.h / 2),
        0, 0, Math.PI * 2,
      );
      ctx.stroke();
      break;

    case "line":
      ctx.beginPath();
      ctx.moveTo(el.x1, el.y1);
      ctx.lineTo(el.x2, el.y2);
      ctx.stroke();
      break;

    case "arrow": {
      ctx.beginPath();
      ctx.moveTo(el.x1, el.y1);
      ctx.lineTo(el.x2, el.y2);
      ctx.stroke();
      const ang = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
      const hd = Math.max(10, (el.width || 2) * 4);
      ctx.beginPath();
      ctx.moveTo(el.x2, el.y2);
      ctx.lineTo(
        el.x2 - hd * Math.cos(ang - Math.PI / 6),
        el.y2 - hd * Math.sin(ang - Math.PI / 6),
      );
      ctx.moveTo(el.x2, el.y2);
      ctx.lineTo(
        el.x2 - hd * Math.cos(ang + Math.PI / 6),
        el.y2 - hd * Math.sin(ang + Math.PI / 6),
      );
      ctx.stroke();
      break;
    }

    case "text":
      if (el.text) {
        ctx.font = `${Math.max(14, (el.width || 2) * 5)}px sans-serif`;
        ctx.fillText(el.text, el.x, el.y);
      }
      break;

    default:
      break;
  }
  ctx.restore();
}

function drawCursor(ctx, x, y, username) {
  ctx.save();
  ctx.fillStyle = "#a78bfa";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 12, y + 18);
  ctx.lineTo(x + 5, y + 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (username) {
    ctx.font = "11px sans-serif";
    const tw = ctx.measureText(username).width;
    ctx.fillStyle = "#a78bfa";
    ctx.fillRect(x + 14, y + 16, tw + 6, 16);
    ctx.fillStyle = "#fff";
    ctx.fillText(username, x + 17, y + 27);
  }
  ctx.restore();
}

function hitTest(el, x, y) {
  switch (el.type) {
    case "pen":
      return el.points?.some((p) => Math.hypot(p.x - x, p.y - y) <= ERASER_R) ?? false;

    case "rect":
    case "ellipse":
      return (
        x >= el.x - ERASER_R && x <= el.x + el.w + ERASER_R &&
        y >= el.y - ERASER_R && y <= el.y + el.h + ERASER_R
      );

    case "text":
      return Math.hypot(x - el.x, y - el.y) <= ERASER_R * 2;

    case "line":
    case "arrow": {
      const dx = el.x2 - el.x1;
      const dy = el.y2 - el.y1;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) return Math.hypot(x - el.x1, y - el.y1) <= ERASER_R;
      const t = Math.max(0, Math.min(1, ((x - el.x1) * dx + (y - el.y1) * dy) / len2));
      return Math.hypot(x - (el.x1 + t * dx), y - (el.y1 + t * dy)) <= ERASER_R;
    }

    default:
      return false;
  }
}

const TOOLS = [
  { id: "pen",     Icon: Pen,        label: "Pen" },
  { id: "rect",    Icon: Square,     label: "Rectangle" },
  { id: "ellipse", Icon: Circle,     label: "Ellipse" },
  { id: "line",    Icon: Minus,      label: "Line" },
  { id: "arrow",   Icon: ArrowRight, label: "Arrow" },
  { id: "text",    Icon: Type,       label: "Text" },
  { id: "eraser",  Icon: Eraser,     label: "Eraser" },
];

export default function WhiteBoard({
  roomId,
  boardElements,
  boardCursors,
  isOwner,
  onAddElement,
  onRemoveElements,
  onUndo,
  onClear,
  onCursorMove,
}) {
  const canvasRef = useRef(null);
  const startRef = useRef(null);
  const elementsRef = useRef(boardElements);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [drawing, setDrawing] = useState(false);
  const [penPts, setPenPts] = useState([]);
  const [draft, setDraft] = useState(null);
  const [eraserHit, setEraserHit] = useState(new Set());
  const [textInput, setTextInput] = useState(null);
  const [textVal, setTextVal] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    elementsRef.current = boardElements;
  }, [boardElements]);

  // Redraw on every relevant state change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.fillStyle = "#12121f";
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    for (const el of boardElements) {
      if (tool === "eraser" && drawing && eraserHit.has(String(el.id))) {
        renderEl(ctx, { ...el, color: "#f87171" });
      } else {
        renderEl(ctx, el);
      }
    }

    if (tool === "pen" && drawing && penPts.length >= 2) {
      renderEl(ctx, { type: "pen", points: penPts, color, width: strokeWidth });
    }

    if (draft) {
      renderEl(ctx, { ...draft, color, width: strokeWidth });
    }

    for (const [, cur] of Object.entries(boardCursors)) {
      drawCursor(ctx, cur.x, cur.y, cur.username);
    }
  }, [boardElements, boardCursors, drawing, penPts, draft, eraserHit, color, strokeWidth, tool]);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const pos = toLogical(e, canvasRef.current);

    if (tool === "text") {
      const r = canvasRef.current.getBoundingClientRect();
      setTextInput({
        x: pos.x,
        y: pos.y,
        sx: r.left + (pos.x / LOGICAL_W) * r.width,
        sy: r.top + (pos.y / LOGICAL_H) * r.height,
      });
      setTextVal("");
      return;
    }

    setDrawing(true);
    startRef.current = pos;

    if (tool === "pen") {
      setPenPts([pos]);
    } else if (tool === "eraser") {
      const hit = new Set();
      for (const el of elementsRef.current) {
        if (hitTest(el, pos.x, pos.y)) hit.add(String(el.id));
      }
      setEraserHit(hit);
    } else {
      setDraft({
        type: tool,
        x: pos.x, y: pos.y, w: 0, h: 0,
        x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y,
      });
    }
  }, [tool]);

  const onMouseMove = useCallback((e) => {
    const pos = toLogical(e, canvasRef.current);
    onCursorMove(pos.x, pos.y);
    if (!drawing) return;

    if (tool === "pen") {
      setPenPts((prev) => [...prev, pos]);
    } else if (tool === "eraser") {
      setEraserHit((prev) => {
        const next = new Set(prev);
        for (const el of elementsRef.current) {
          if (hitTest(el, pos.x, pos.y)) next.add(String(el.id));
        }
        return next;
      });
    } else if (draft && startRef.current) {
      const s = startRef.current;
      if (tool === "rect" || tool === "ellipse") {
        setDraft((prev) => ({
          ...prev,
          x: Math.min(s.x, pos.x),
          y: Math.min(s.y, pos.y),
          w: Math.abs(pos.x - s.x),
          h: Math.abs(pos.y - s.y),
        }));
      } else {
        setDraft((prev) => ({ ...prev, x2: pos.x, y2: pos.y }));
      }
    }
  }, [drawing, tool, draft, onCursorMove]);

  const onMouseUp = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);

    if (tool === "pen") {
      if (penPts.length >= 2) {
        const element = { id: makeId(), type: "pen", points: penPts, color, width: strokeWidth };
        onAddElement(element);
      }
      setPenPts([]);
    } else if (tool === "eraser") {
      if (eraserHit.size > 0) onRemoveElements([...eraserHit]);
      setEraserHit(new Set());
    } else if (draft) {
      const d = draft;
      let el = null;
      const minSize = 2;

      if (tool === "rect" && d.w > minSize && d.h > minSize) {
        el = { id: makeId(), type: "rect", x: d.x, y: d.y, w: d.w, h: d.h, color, width: strokeWidth };
      } else if (tool === "ellipse" && d.w > minSize && d.h > minSize) {
        el = { id: makeId(), type: "ellipse", x: d.x, y: d.y, w: d.w, h: d.h, color, width: strokeWidth };
      } else if (tool === "line") {
        const dist = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
        if (dist > minSize) el = { id: makeId(), type: "line", x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2, color, width: strokeWidth };
      } else if (tool === "arrow") {
        const dist = Math.hypot(d.x2 - d.x1, d.y2 - d.y1);
        if (dist > minSize) el = { id: makeId(), type: "arrow", x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2, color, width: strokeWidth };
      }

      if (el) onAddElement(el);
      setDraft(null);
    }
  }, [drawing, tool, penPts, eraserHit, draft, color, strokeWidth, onAddElement, onRemoveElements]);

  const submitText = useCallback(() => {
    if (textInput && textVal.trim()) {
      onAddElement({
        id: makeId(), type: "text",
        x: textInput.x, y: textInput.y,
        w: 200, h: 30,
        text: textVal.trim(),
        color, width: strokeWidth,
      });
    }
    setTextInput(null);
    setTextVal("");
  }, [textInput, textVal, color, strokeWidth, onAddElement]);

  const doExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `board-${roomId || "export"}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-[#15151A] border-b border-gray-800 flex-wrap shrink-0">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            className={`p-1.5 rounded transition ${
              tool === t.id
                ? "bg-lime-400/20 text-lime-400 border border-lime-400/40"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
            }`}
          >
            <t.Icon size={16} />
          </button>
        ))}

        <div className="w-px h-6 bg-gray-700 mx-1" />

        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            title={c}
            className={`w-5 h-5 rounded-full border-2 transition ${
              color === c ? "border-lime-400 scale-125" : "border-transparent hover:border-gray-500"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}

        <div className="w-px h-6 bg-gray-700 mx-1" />

        {STROKE_WIDTHS.map((w) => (
          <button
            key={w}
            onClick={() => setStrokeWidth(w)}
            title={`${w}px`}
            className={`flex items-center justify-center w-7 h-7 rounded transition ${
              strokeWidth === w
                ? "bg-lime-400/20 border border-lime-400/40"
                : "hover:bg-white/5"
            }`}
          >
            <span
              className="rounded-full bg-gray-300 inline-block"
              style={{ width: w + 2, height: w + 2 }}
            />
          </button>
        ))}

        <div className="flex-1" />

        <button
          onClick={onUndo}
          title="Undo your last element"
          className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-white/5 transition"
        >
          <Undo2 size={16} />
        </button>

        {isOwner && !confirmClear && (
          <button
            onClick={() => setConfirmClear(true)}
            title="Clear board"
            className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition"
          >
            <Trash2 size={16} />
          </button>
        )}

        {isOwner && confirmClear && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-red-400">Clear all?</span>
            <button
              onClick={() => { onClear(); setConfirmClear(false); }}
              className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400 hover:bg-gray-600 transition"
            >
              No
            </button>
          </div>
        )}

        <button
          onClick={doExport}
          title="Export as PNG"
          className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-white/5 transition"
        >
          <Download size={16} />
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 min-h-0 overflow-hidden bg-[#12121f] relative">
        <canvas
          ref={canvasRef}
          width={LOGICAL_W}
          height={LOGICAL_H}
          style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }}
          className={tool === "eraser" ? "cursor-cell" : "cursor-crosshair"}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />

        {textInput && (
          <textarea
            autoFocus
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
            onBlur={submitText}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitText(); }
              if (e.key === "Escape") { setTextInput(null); setTextVal(""); }
            }}
            style={{
              position: "fixed",
              left: textInput.sx,
              top: textInput.sy,
              zIndex: 20,
              minWidth: 150,
              minHeight: 36,
            }}
            className="bg-[#1a1a2e]/90 border border-lime-400/40 text-white text-sm px-2 py-1 rounded outline-none resize-none"
            placeholder="Type, then Enter"
            rows={2}
          />
        )}
      </div>
    </div>
  );
}
