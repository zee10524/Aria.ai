import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// Syntax token types → Tailwind/CSS colour classes per mode
const TOKEN_COLOR = {
  comment: { dark: "#6b7280", light: "#6b7280" },       // gray
  keyword: { dark: "#DFFF5E", light: "#3C4B1A" },        // lime / dark-olive
  func:    { dark: "#a78bfa", light: "#5C5C78" },        // purple
  prop:    { dark: "#93c5fd", light: "#1d4ed8" },        // blue
  string:  { dark: "#86efac", light: "#166534" },        // green
  bool:    { dark: "#fb923c", light: "#c2410c" },        // orange
  normal:  { dark: "#e5e7eb", light: "#111827" },        // plain text
};

const CODE_LINES = [
  [{ t: "comment", v: "// 🚀 Create your DevRoom" }],
  [
    { t: "keyword", v: "const" },
    { t: "normal",  v: " room = " },
    { t: "keyword", v: "await" },
    { t: "func",    v: " ARIA" },
    { t: "normal",  v: ".create({" },
  ],
  [
    { t: "prop",    v: "  name" },
    { t: "normal",  v: ": " },
    { t: "string",  v: '"ai-workspace"' },
    { t: "normal",  v: "," },
  ],
  [
    { t: "prop",    v: "  ai" },
    { t: "normal",  v: ": " },
    { t: "bool",    v: "true" },
    { t: "normal",  v: "," },
  ],
  [
    { t: "prop",    v: "  collab" },
    { t: "normal",  v: ": [" },
    { t: "string",  v: '"alice"' },
    { t: "normal",  v: ", " },
    { t: "string",  v: '"bob"' },
    { t: "normal",  v: "]," },
  ],
  [{ t: "normal", v: "});" }],
  [],  // blank
  [{ t: "comment", v: "// ✓ Room ready — AI connected" }],
  [
    { t: "func",   v: "console" },
    { t: "normal", v: ".log(" },
    { t: "string", v: '"Room ID:"' },
    { t: "normal", v: ", room." },
    { t: "prop",   v: "id" },
    { t: "normal", v: ");" },
  ],
];

// Flatten CODE_LINES into an array of visible characters one-by-one
function buildTypeChunks() {
  const chunks = [];
  CODE_LINES.forEach((tokens, li) => {
    tokens.forEach((tok) => {
      tok.v.split("").forEach((ch) => chunks.push({ li, tok: tok.t, ch }));
    });
    chunks.push({ li, tok: "newline", ch: "\n" });
  });
  return chunks;
}
const CHUNKS = buildTypeChunks();

export default function CodeWindow({ dark }) {
  const [revealed, setRevealed] = useState(0); // chars revealed so far
  const [blinkOn, setBlinkOn] = useState(true);
  const idxRef = useRef(0);

  // Typewriter — runs once on mount
  useEffect(() => {
    idxRef.current = 0;
    setRevealed(0);
    const speed = 28; // ms per char
    const timer = setInterval(() => {
      idxRef.current += 1;
      setRevealed(idxRef.current);
      if (idxRef.current >= CHUNKS.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, []);

  // Blinking cursor
  useEffect(() => {
    const t = setInterval(() => setBlinkOn((b) => !b), 530);
    return () => clearInterval(t);
  }, []);

  // Build rendered lines from revealed chunks
  const lines = [];
  let currentLine = [];
  CHUNKS.slice(0, revealed).forEach(({ li, tok, ch }) => {
    if (tok === "newline") {
      lines.push({ idx: li, tokens: currentLine });
      currentLine = [];
    } else {
      const last = currentLine[currentLine.length - 1];
      if (last && last.tok === tok) {
        last.v += ch;
      } else {
        currentLine.push({ tok, v: ch });
      }
    }
  });

  const bg    = dark ? "#15151A" : "#f9fafb";
  const topBg = dark ? "#111116" : "#f3f4f6";
  const border = dark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const lineNumColor = dark ? "#4b5563" : "#9ca3af";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
      className="rounded-xl overflow-hidden shadow-2xl font-mono text-xs sm:text-sm"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: dark
          ? "0 0 40px rgba(223,255,94,0.07), 0 20px 60px rgba(0,0,0,0.5)"
          : "0 0 40px rgba(79,93,47,0.08), 0 20px 60px rgba(0,0,0,0.12)",
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ background: topBg, borderColor: border }}
      >
        <span className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
        <span className="w-3 h-3 rounded-full bg-yellow-400 opacity-80" />
        <span className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
        <span
          className="ml-3 text-xs tracking-wide"
          style={{ color: dark ? "#6b7280" : "#9ca3af" }}
        >
          devroom.js
        </span>
        {/* AI badge */}
        <span
          className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold"
          style={{
            background: dark ? "rgba(223,255,94,0.12)" : "rgba(79,93,47,0.1)",
            color: dark ? "#DFFF5E" : "#3C4B1A",
            border: `1px solid ${dark ? "rgba(223,255,94,0.25)" : "rgba(79,93,47,0.2)"}`,
          }}
        >
          AI ●
        </span>
      </div>

      {/* Code area */}
      <div className="p-4 leading-6 min-h-[220px]" style={{ background: bg }}>
        {lines.map((line, i) => (
          <div key={i} className="flex">
            {/* Line number */}
            <span
              className="w-8 shrink-0 text-right mr-4 select-none"
              style={{ color: lineNumColor }}
            >
              {i + 1}
            </span>
            {/* Tokens */}
            <span>
              {line.tokens.map((tok, j) => (
                <span
                  key={j}
                  style={{
                    color:
                      TOKEN_COLOR[tok.tok]?.[dark ? "dark" : "light"] ??
                      TOKEN_COLOR.normal[dark ? "dark" : "light"],
                  }}
                >
                  {tok.v}
                </span>
              ))}
              {/* Cursor on last line */}
              {i === lines.length - 1 && revealed < CHUNKS.length && (
                <span
                  className="inline-block w-[2px] h-[1em] ml-px align-text-bottom"
                  style={{
                    background: dark ? "#DFFF5E" : "#3C4B1A",
                    opacity: blinkOn ? 1 : 0,
                    transition: "opacity 0.1s",
                  }}
                />
              )}
            </span>
          </div>
        ))}
        {/* Final static cursor when done */}
        {revealed >= CHUNKS.length && (
          <div className="flex">
            <span
              className="w-8 shrink-0 text-right mr-4 select-none"
              style={{ color: lineNumColor }}
            >
              {lines.length + 1}
            </span>
            <span
              className="inline-block w-[2px] h-[1em] align-text-bottom"
              style={{
                background: dark ? "#DFFF5E" : "#3C4B1A",
                opacity: blinkOn ? 1 : 0,
                transition: "opacity 0.1s",
              }}
            />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div
        className="flex items-center justify-between px-4 py-1.5 text-[10px] border-t"
        style={{
          background: dark ? "rgba(223,255,94,0.06)" : "rgba(79,93,47,0.05)",
          borderColor: border,
          color: dark ? "#DFFF5E" : "#4F5D2F",
        }}
      >
        <span>JavaScript</span>
        <span className="flex items-center gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: dark ? "#DFFF5E" : "#4F5D2F" }}
          />
          AI Connected
        </span>
        <span>Ln {Math.min(lines.length, CODE_LINES.length)}</span>
      </div>
    </motion.div>
  );
}
