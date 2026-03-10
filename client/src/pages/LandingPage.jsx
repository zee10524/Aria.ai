import { useEffect, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import MatrixRain from "../components/ui/MatrixRain";
import CodeWindow from "../components/ui/CodeWindow";
import BitFlipText from "../components/ui/BitFlipText";
import ScrollingCodeBand from "../components/ui/ScrollingCodeBand";

function getInitialTheme() {
  if (typeof window === "undefined") return false;
  if (localStorage.theme === "dark") return true;
  if (localStorage.theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function LandingPage() {
  const [dark, setDark] = useState(getInitialTheme);
  const { scrollYProgress } = useScroll();
  const shouldReduceMotion = useReducedMotion();

  // Subtle parallax for hero content
  const heroY = useTransform(scrollYProgress, [0, 0.4], [0, -60]);

  const fadeUp = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.2 } },
      }
    : {
        hidden: { opacity: 0, y: 28 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.65, ease: "easeOut" },
        },
      };

  const staggerContainer = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.theme = dark ? "dark" : "light";
  }, [dark]);

  return (
    <div
      className="relative bg-background-light dark:bg-background-dark transition-colors duration-300 min-h-screen selection:bg-primary selection:text-black overflow-hidden"
      style={{ color: dark ? "#e5e7eb" : "#111827" }}
    >
      {/* ═══════════════ MATRIX RAIN BACKGROUND ═══════════════ */}
      {!shouldReduceMotion && <MatrixRain dark={dark} />}

      {/* Gradient vignette over canvas so content stays readable */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background: dark
            ? "radial-gradient(ellipse 80% 80% at 50% 10%, rgba(10,10,14,0.55) 0%, rgba(10,10,14,0.92) 100%)"
            : "radial-gradient(ellipse 80% 80% at 50% 10%, rgba(245,245,240,0.45) 0%, rgba(245,245,240,0.9) 100%)",
        }}
      />

      <div className="relative z-10">
      {/* ================= NAVBAR ================= */}
      <motion.nav
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="fixed w-full z-50 backdrop-blur-md bg-background-light/80 dark:bg-background-dark/80 border-b border-gray-200 dark:border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black font-bold font-display text-xl">
                A
              </div>
              <span className="font-display font-bold text-xl tracking-tight" style={{ color: dark ? '#ffffff' : '#111827' }}>
                ARIA<span className="text-primary">.ai</span>
              </span>
            </div>

            <div className="hidden md:flex space-x-8 text-sm font-medium">
              {["Features", "Integrations", "Pricing", "Docs"].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="hover:text-primary transition-colors" style={{ color: dark ? '#d1d5db' : '#374151' }}
                >
                  {item}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setDark((p) => !p)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">
                  {dark ? "light_mode" : "dark_mode"}
                </span>
              </button>

              <a className="hidden sm:block text-sm font-medium" style={{ color: dark ? '#d1d5db' : '#374151' }} href="/login">
                Sign In
              </a>

              <a className="bg-primary hover:bg-primary-dark text-black px-4 py-2 rounded-md text-sm font-bold shadow-[0_0_15px_rgba(223,255,94,0.3)] hover:shadow-[0_0_25px_rgba(223,255,94,0.5)] transition">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ================= HERO ================= */}
      <section className="relative pt-32 pb-0 lg:pt-48 overflow-visible">
        <div className="absolute inset-0 bg-hero-glow-light dark:bg-hero-glow opacity-30 pointer-events-none" />

        <motion.div
          style={shouldReduceMotion ? {} : { y: heroY }}
          className="relative z-10 max-w-7xl mx-auto px-4"
        >
          {/* Two-column: text left, CodeWindow right */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* LEFT: headline + CTA */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="text-left"
            >
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-light dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-medium mb-8"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                ARIA AI 2.0 is now live
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight"
                style={{ color: dark ? "#ffffff" : "#111827" }}
              >
                Collaborate.{" "}
                <br className="hidden sm:block" />
                Code.
                <br />
                <span className="light-text-gradient dark:text-gradient">
                  Debug. Together.
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="max-w-lg text-xl mb-10"
                style={{ color: dark ? "#9ca3af" : "#4b5563" }}
              >
                The first AI-native collaboration platform. Spin up instant dev
                environments, chat with context-aware AI, and ship faster than
                ever before.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="flex flex-col sm:flex-row gap-4 mb-6"
              >
                <motion.a
                  whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.02 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  href="/signup"
                  className="px-8 py-4 bg-primary text-black font-bold rounded-lg shadow-lg hover:scale-105 transition text-center"
                >
                  Create Room →
                </motion.a>
                <motion.a
                  whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.02 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  className="px-8 py-4 border rounded-lg text-center"
                  style={{
                    backgroundColor: dark ? "rgba(255,255,255,0.05)" : "#ffffff",
                    borderColor: dark ? "rgba(255,255,255,0.1)" : "#d1d5db",
                    color: dark ? "#e5e7eb" : "#111827",
                  }}
                >
                  Join Existing
                </motion.a>
              </motion.div>

              {/* Inline stats */}
              <motion.div
                variants={fadeUp}
                className="flex items-center gap-6 text-sm mt-2"
                style={{ color: dark ? "#6b7280" : "#9ca3af" }}
              >
                {[["50k+", "Developers"], ["200+", "Integrations"], ["99.9%", "Uptime"]].map(
                  ([num, label]) => (
                    <div key={label} className="text-center">
                      <div
                        className="font-bold text-base font-mono"
                        style={{ color: dark ? "#DFFF5E" : "#4F5D2F" }}
                      >
                        {num}
                      </div>
                      <div className="text-xs">{label}</div>
                    </div>
                  )
                )}
              </motion.div>
            </motion.div>

            {/* RIGHT: Live Code Window */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            >
              <CodeWindow dark={dark} />

              {/* Floating badge below code window */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8, duration: 0.5 }}
                className="mt-3 flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg w-fit ml-auto"
                style={{
                  background: dark ? "rgba(223,255,94,0.07)" : "rgba(79,93,47,0.06)",
                  border: `1px solid ${dark ? "rgba(223,255,94,0.15)" : "rgba(79,93,47,0.15)"}`,
                  color: dark ? "#DFFF5E" : "#4F5D2F",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: dark ? "#DFFF5E" : "#4F5D2F" }}
                />
                Room ready in 0.4s
              </motion.div>
            </motion.div>
          </div>

          {/* Dashboard screenshot — full width below columns */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative mt-16 max-w-5xl mx-auto"
          >
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-20" />
            <img
              className="relative rounded-xl border shadow-2xl"
              style={{
                borderColor: dark ? "rgba(255,255,255,0.1)" : "#e5e7eb",
                boxShadow: dark
                  ? "0 0 60px rgba(223,255,94,0.08), 0 30px 80px rgba(0,0,0,0.6)"
                  : "0 30px 80px rgba(0,0,0,0.15)",
              }}
              src="dashboard.svg"
              alt="ARIA dashboard"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ================= SCROLLING CODE BAND ================= */}
      <div className="mt-16">
        <ScrollingCodeBand dark={dark} />
        <ScrollingCodeBand dark={dark} reverse={true} opacity={0.6} />
      </div>

      {/* ================= LOGOS ================= */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        variants={staggerContainer}
        className="py-10"
        style={{ background: dark ? "rgba(21,21,26,0.7)" : "rgba(255,255,255,0.8)" }}
      >
        <p className="text-center text-xs tracking-widest uppercase mb-6" style={{ color: dark ? "#6b7280" : "#6b7280" }}>
          Powering engineering teams at
        </p>
        <div className="flex justify-center flex-wrap gap-12 opacity-60">
          {["AcmeCorp", "StarShip", "FastScale", "InfinityLoop", "GridStack"].map((c) => (
            <motion.div
              key={c}
              variants={fadeUp}
              whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
              className="font-display font-bold text-xl"
              style={{ color: dark ? "#ffffff" : "#374151" }}
            >
              {c}
            </motion.div>
          ))}
        </div>
      </motion.section>

      <ScrollingCodeBand dark={dark} reverse={true} opacity={0.7} />

      {/* ================= FEATURES ================= */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
        className="py-24"
      >
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.div variants={fadeUp}>
            <BitFlipText
              text="Supercharge your git workflow"
              dark={dark}
              as="h2"
              className="text-3xl md:text-5xl font-display font-bold mb-6"
              style={{ color: dark ? "#ffffff" : "#111827" }}
              delay={100}
            />
          </motion.div>
          <motion.p variants={fadeUp} className="text-lg mb-20" style={{ color: dark ? "#9ca3af" : "#4b5563" }}>
            Forget screen sharing and merge conflicts. ARIA brings your entire
            team into the same context.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              ["chat", "Real-time Collaboration", "Live cursors, shared terminals, and instant synced edits."],
              ["bug_report", "AI Bug Detection", "Context-aware AI explains errors and suggests fixes instantly."],
              ["smart_toy", "Context-Aware Assistant", "Ask questions about your codebase — AI knows the full context."],
            ].map(([icon, title, desc]) => (
              <motion.div
                key={title}
                variants={fadeUp}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: -6,
                        boxShadow: dark
                          ? "0 0 30px rgba(223,255,94,0.1)"
                          : "0 10px 40px rgba(79,93,47,0.12)",
                      }
                }
                className="p-8 rounded-2xl border transition-all duration-300 group"
                style={{
                  backgroundColor: dark ? "rgba(21,21,26,0.8)" : "rgba(255,255,255,0.8)",
                  borderColor: dark ? "rgba(255,255,255,0.07)" : "#e5e7eb",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: dark ? "rgba(223,255,94,0.1)" : "rgba(79,93,47,0.08)" }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: dark ? "#DFFF5E" : "#4F5D2F" }}
                  >
                    {icon}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-2" style={{ color: dark ? "#ffffff" : "#111827" }}>
                  {title}
                </h3>
                <p style={{ color: dark ? "#9ca3af" : "#4b5563" }}>{desc}</p>
                <div
                  className="mt-4 h-px w-0 group-hover:w-full transition-all duration-500"
                  style={{
                    background: dark
                      ? "linear-gradient(to right, #DFFF5E, transparent)"
                      : "linear-gradient(to right, #4F5D2F, transparent)",
                  }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <ScrollingCodeBand dark={dark} opacity={0.8} />

      {/* ================= LAPTOP SECTION ================= */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
        className="py-24"
        style={{ background: dark ? "rgba(5,5,7,0.85)" : "rgba(243,244,246,0.85)" }}
      >
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div variants={fadeUp}>
            <BitFlipText
              text="From Idea to Production in Record Time"
              dark={dark}
              as="h2"
              className="text-4xl font-display font-bold mb-6"
              style={{ color: dark ? "#ffffff" : "#111827" }}
              delay={150}
            />
            <p className="mb-8" style={{ color: dark ? "#9ca3af" : "#4b5563" }}>
              Connect GitHub, GitLab, or Bitbucket and start coding instantly.
              No config, no waiting — your full stack is ready in seconds.
            </p>
            <div className="space-y-3">
              {[
                "Instant environment provisioning",
                "Automatic dependency resolution",
                "One-click deploy with preview URLs",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: dark ? "rgba(223,255,94,0.15)" : "rgba(79,93,47,0.1)",
                      color: dark ? "#DFFF5E" : "#4F5D2F",
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ color: dark ? "#d1d5db" : "#374151" }}>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.img
            variants={fadeUp}
            whileHover={shouldReduceMotion ? undefined : { scale: 1.01 }}
            className="rounded-xl shadow-2xl"
            style={{ border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "#e5e7eb"}` }}
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBPbJn2HUs7xAJ1nKp6A_50PNrH96K4UuIV9CyCCTCk0WTCxHH2w4EatM8lwNorGJNrDp4V_KvNikt5yY4M3nU-vrpXJJmWDirQ_FlFNdFEP3_e4XqxmwlHtek1NLr8aiEXnbc0w7Ppx_4e9R7SUiuZ_4C89mOarglz3MbdEQ8haYmdDimAfTYzF6wA4Ed3zVXorZTYp9BSJRF5PjHHVbCA_o0nwoUVbwqbErTBZALnC2MykcQX_iSKJDBjYKjko6JR1DFmU29jMY"
            alt="Laptop"
          />
        </div>
      </motion.section>

      <ScrollingCodeBand dark={dark} reverse={true} opacity={0.75} />

      {/* ================= CTA ================= */}
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
        className="py-24 text-center relative overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: dark
              ? "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(223,255,94,0.06) 0%, transparent 70%)"
              : "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(79,93,47,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <motion.div variants={fadeUp}>
            <BitFlipText
              text="Start coding for free."
              dark={dark}
              as="h2"
              className="text-5xl font-display font-bold mb-6"
              style={{ color: dark ? "#ffffff" : "#111827" }}
              delay={80}
            />
          </motion.div>
          <motion.p variants={fadeUp} className="mb-10 text-lg" style={{ color: dark ? "#9ca3af" : "#4b5563" }}>
            Join thousands of developers building with AI collaboration.
          </motion.p>
          <motion.a
            variants={fadeUp}
            whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.02 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            href="/signup"
            className="inline-block px-10 py-4 bg-primary text-black font-bold rounded-lg shadow-[0_0_30px_rgba(223,255,94,0.35)] hover:shadow-[0_0_50px_rgba(223,255,94,0.55)] transition"
          >
            Get Started Now
          </motion.a>
        </div>
      </motion.section>

      {/* ================= FOOTER ================= */}
      <motion.footer
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
        className="border-t"
        style={{
          borderColor: dark ? "rgba(255,255,255,0.1)" : "#e5e7eb",
          backgroundColor: dark ? "rgba(21,21,26,0.9)" : "rgba(255,255,255,0.9)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <motion.div variants={fadeUp} className="font-display font-bold text-lg" style={{ color: dark ? "#ffffff" : "#111827" }}>
            ARIA<span className="text-primary">.ai</span>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-center gap-6 text-sm" style={{ color: dark ? "#9ca3af" : "#4b5563" }}>
            {["Privacy", "Terms", "Docs"].map((item) => (
              <a key={item} href="#" className="hover:text-primary transition-colors">
                {item}
              </a>
            ))}
          </motion.div>

          <motion.p variants={fadeUp} className="text-sm font-mono" style={{ color: dark ? "#6b7280" : "#6b7280" }}>
            © {new Date().getFullYear()} ARIA AI. All rights reserved.
          </motion.p>
        </div>
      </motion.footer>
      </div>
    </div>
  );
}