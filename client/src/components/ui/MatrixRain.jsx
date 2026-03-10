import { useEffect, useRef } from "react";

// Characters used in the rain — binary + code symbols for "coding vibes"
const RAIN_CHARS =
  "01アイウキク10110100<>{}[]()=>+-*/;|&^%#0x1a2b3c;=>const let function return async await import export";

export default function MatrixRain({ dark }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const FONT_SIZE = 13;
    const chars = RAIN_CHARS.split("");
    let animId;
    let drops = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const cols = Math.floor(canvas.width / FONT_SIZE);
      drops = Array.from({ length: cols }, () => Math.random() * -80);
    };

    resize();

    // Track rendering generation per column for brightness head effect
    const gens = () => Array.from({ length: drops.length }, () => 0);
    let colGen = gens();

    let lastTs = 0;
    const FRAME_INTERVAL = 55; // ~18 fps — performant

    const draw = (ts) => {
      animId = requestAnimationFrame(draw);
      if (ts - lastTs < FRAME_INTERVAL) return;
      lastTs = ts;

      // Transparent trail overlay — slightly different opacity per mode
      ctx.fillStyle = dark
        ? "rgba(10, 10, 14, 0.055)"
        : "rgba(245, 245, 240, 0.09)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px "Courier New", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const y = drops[i];
        const isHead = colGen[i] < 4;

        const char = chars[Math.floor(Math.random() * chars.length)];
        const px = i * FONT_SIZE;
        const py = y * FONT_SIZE;

        if (dark) {
          ctx.fillStyle = isHead ? "#ffffff" : "#DFFF5E";
          ctx.globalAlpha = isHead ? 0.95 : Math.random() * 0.3 + 0.2;
        } else {
          ctx.fillStyle = isHead ? "#3C4B1A" : "#4F5D2F";
          ctx.globalAlpha = isHead ? 0.4 : Math.random() * 0.1 + 0.07;
        }

        ctx.fillText(char, px, py);
        colGen[i]++;

        // Reset drop when it exits canvas bottom
        if (py > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
          colGen[i] = 0;
        }
        drops[i] += 0.55;
      }

      ctx.globalAlpha = 1;
    };

    animId = requestAnimationFrame(draw);

    const onResize = () => {
      resize();
      colGen = gens();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [dark]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 w-full h-full"
      style={{ opacity: dark ? 0.45 : 0.55 }}
    />
  );
}
