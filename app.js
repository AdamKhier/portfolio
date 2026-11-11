(() => {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ——— Footer year ——— */
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ——— Theme toggle ——— */
  const root = document.documentElement;
  const toggle = document.getElementById("themeToggle");
  try {
    if (localStorage.getItem("ak-theme") === "night") setTheme("night");
  } catch (_) { /* storage unavailable */ }
  toggle.addEventListener("click", () => {
    setTheme(root.dataset.theme === "night" ? "paper" : "night");
  });
  function setTheme(mode) {
    root.dataset.theme = mode;
    const night = mode === "night";
    toggle.setAttribute("aria-pressed", String(night));
    toggle.setAttribute("aria-label", night ? "Switch to paper mode" : "Switch to night mode");
    try { localStorage.setItem("ak-theme", mode); } catch (_) { /* ignore */ }
    paintField(); // recolor particles for the new theme
  }

  /* ——— Ticker: duplicate content for a seamless loop ——— */
  const track = document.getElementById("tickerTrack");
  track.innerHTML += track.innerHTML;

  /* ——— Scroll reveal ——— */
  const revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ——— Active nav link ——— */
  const navMap = new Map(
    [...document.querySelectorAll("[data-nav]")].map((a) => [a.dataset.nav, a])
  );
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navMap.forEach((a) => a.classList.remove("is-active"));
        navMap.get(e.target.id)?.classList.add("is-active");
      }),
      { rootMargin: "-40% 0px -55% 0px" }
    );
    ["work", "about", "toolbox", "contact"].forEach((id) => {
      const s = document.getElementById(id);
      if (s) spy.observe(s);
    });
  }

  /* ——— Project filtering ——— */
  const chips = [...document.querySelectorAll(".chip")];
  const cards = [...document.querySelectorAll(".card")];
  chips.forEach((chip) => chip.addEventListener("click", () => {
    chips.forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    const f = chip.dataset.filter;
    cards.forEach((card) => {
      const show = f === "all" || card.dataset.cat.split(" ").includes(f);
      card.classList.toggle("is-hidden", !show);
      card.classList.remove("pop");
      if (show && !reduceMotion) { void card.offsetWidth; card.classList.add("pop"); }
    });
  }));

  /* ——— Subtle card tilt (fine pointers only) ——— */
  if (finePointer && !reduceMotion) {
    cards.forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(700px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateY(-3px)`;
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
  }

  /* ——— Hero particle field ——— */
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");
  let pts = [], raf = 0, running = false;
  let mouse = { x: -9999, y: -9999 };
  const COUNT = 70, LINK = 130;

  function themeColors() {
    const night = root.dataset.theme === "night";
    return { dot: night ? "139,160,255" : "36,71,245", line: night ? "139,160,255" : "26,35,64" };
  }
  function paintField() { /* colors read live each frame; nothing cached */ }

  function sizeCanvas() {
    const r = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed(r.width, r.height);
  }
  function seed(w, h) {
    pts = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: 1 + Math.random() * 1.8,
    }));
  }
  function frame() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const { dot, line } = themeColors();
    ctx.clearRect(0, 0, w, h);
    for (const p of pts) {
      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 140 * 140 && d2 > 1) {
        const d = Math.sqrt(d2);
        p.vx += (dx / d) * 0.012; p.vy += (dy / d) * 0.012;
      }
      p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(${line},${((1 - d / LINK) * 0.22).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const p of pts) {
      ctx.fillStyle = `rgba(${dot},0.55)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; frame(); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  if (reduceMotion) {
    sizeCanvas();
    // One static paint so the hero still has texture.
    const { dot } = themeColors();
    ctx.fillStyle = `rgba(${dot},0.5)`;
    pts.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
  } else {
    sizeCanvas(); start();
    canvas.parentElement.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    canvas.parentElement.addEventListener("pointerleave", () => { mouse.x = -9999; mouse.y = -9999; });
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(sizeCanvas, 150); });
  }
})();
