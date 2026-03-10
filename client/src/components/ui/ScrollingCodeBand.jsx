import { motion } from "framer-motion";

const BAND_TEXT =
  "01001000 0x4155 const=>async 10110101 {}[]() 0xDEAD 11001010 await=>return 01110011 function 0xFF DFFF5E 10101010 export default 01100110 Promise<void> 0x1A2B ";

// Doubles the string for seamless infinite loop
const BAND = (BAND_TEXT + BAND_TEXT + BAND_TEXT).repeat(2);

/**
 * ScrollingCodeBand
 * A cinematic ticker of binary + code tokens that auto-scrolls.
 * Scroll direction alternates between instances for depth effect.
 *
 * Props:
 *   dark      — boolean
 *   reverse   — reverse scrolling direction (default false)
 *   opacity   — base opacity multiplier (default 1)
 */
export default function ScrollingCodeBand({ dark, reverse = false, opacity = 1 }) {
  const borderColor = dark ? "rgba(223,255,94,0.1)" : "rgba(79,93,47,0.12)";
  const textColor   = dark ? "rgba(223,255,94,0.55)" : "rgba(79,93,47,0.45)";
  const bgColor     = dark ? "rgba(10,10,14,0.6)" : "rgba(245,245,240,0.7)";

  return (
    <div
      className="overflow-hidden py-2 border-y font-mono text-[11px] tracking-widest select-none"
      style={{
        borderColor,
        background: bgColor,
        opacity,
      }}
      aria-hidden="true"
    >
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: reverse ? ["0%", "-50%"] : ["-50%", "0%"] }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ color: textColor }}
      >
        {BAND}
      </motion.div>
    </div>
  );
}
