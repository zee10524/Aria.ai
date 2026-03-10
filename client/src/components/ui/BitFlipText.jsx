import { useEffect, useRef, useState } from "react";

const SCRAMBLE_CHARS = "01アイウエオ<>{}[]/\\|=+-*&#%$@!0x1A2B";

/**
 * BitFlipText
 * Scrambles each character through random "bit-flip" glyphs before
 * settling on the real text. Triggers when the element enters the viewport.
 *
 * Props:
 *   text      — the final string to display
 *   dark      — boolean (for colour)
 *   className — forwarded className
 *   style     — forwarded style
 *   as        — tag to render ("h1", "h2", "span", …)  default "span"
 *   delay     — ms before animation starts           default 0
 */
export default function BitFlipText({
  text,
  dark,
  className = "",
  style = {},
  as: Tag = "span",
  delay = 0,
}) {
  const [displayed, setDisplayed] = useState(text);
  const ref = useRef(null);
  const triggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;

          setTimeout(() => {
            const chars = text.split("");
            const TOTAL_STEPS = 14;           // scramble cycles per character
            const STEP_INTERVAL = 30;         // ms per cycle
            const CHAR_STAGGER = 38;          // ms between each character starting

            chars.forEach((finalChar, charIdx) => {
              if (finalChar === " ") return; // skip spaces

              let step = 0;
              const revealAt = Math.floor(
                (charIdx / chars.length) * TOTAL_STEPS * 0.5
              );

              const t = setInterval(() => {
                step++;
                setDisplayed((prev) => {
                  const arr = prev.split("");
                  if (step >= TOTAL_STEPS) {
                    arr[charIdx] = finalChar; // lock in
                  } else if (step > revealAt) {
                    arr[charIdx] =
                      SCRAMBLE_CHARS[
                        Math.floor(Math.random() * SCRAMBLE_CHARS.length)
                      ];
                  }
                  return arr.join("");
                });

                if (step >= TOTAL_STEPS) clearInterval(t);
              }, STEP_INTERVAL);
            });
          }, delay);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [text, delay]);

  return (
    <Tag ref={ref} className={className} style={style}>
      {displayed.split("").map((ch, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            // Glitching chars get accent colour; settled chars get normal
            color:
              ch !== text[i] && ch !== " "
                ? dark
                  ? "#DFFF5E"
                  : "#4F5D2F"
                : undefined,
            transition: "color 0.05s",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </Tag>
  );
}
