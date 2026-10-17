(() => {
  const canvas = document.getElementById("cosmos");
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w, h, dpr;
  let stars = [], planets = [], sparks = [], ripples = [], shooters = [];
  const pointer = { x: -9999, y: -9999, active: false };

  const PALETTES = [
    ["#c9a7ff", "#4b2a8f"],
    ["#7ff5f5", "#0c5d6b"],
    ["#ffb38a", "#8a3b1f"],
    ["#ff9ecb", "#7a1f5c"],
    ["#a8c4ff", "#1f3a8a"],
    ["#ffe08a", "#8a5a1f"],
  ];
  const SPARK_COLORS = ["#22e5e5", "#c084fc", "#ffffff", "#ffe08a"];

  const rand = (a, b) => a + Math.random() * (b - a);

  function init() {
    const starCount = Math.min(150, Math.floor((w * h) / 9000));
    stars = Array.from({ length: starCount }, () => ({
      x: rand(0, w), y: rand(0, h),
      r: rand(0.4, 1.6),
      vx: rand(-0.04, 0.04), vy: rand(-0.04, 0.04),
      phase: rand(0, Math.PI * 2), speed: rand(0.01, 0.04),
    }));

    const planetCount = w < 500 ? 5 : 7;
    planets = Array.from({ length: planetCount }, (_, i) => {
      const bvx = rand(-0.25, 0.25), bvy = rand(-0.25, 0.25);
      const pal = PALETTES[i % PALETTES.length];
      return {
        x: rand(0, w), y: rand(0, h),
        r: rand(14, 42),
        bvx, bvy, vx: bvx, vy: bvy,
        c0: pal[0], c1: pal[1],
        ring: Math.random() < 0.35,
        moon: Math.random() < 0.4,
        moonAngle: rand(0, Math.PI * 2),
        tilt: rand(-0.6, 0.6),
        pulse: 1,
      };
    });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    init();
  }

  function burst(x, y) {
    ripples.push({ x, y, r: 4, a: 1 });
    for (let i = 0; i < 16; i++) {
      const ang = (Math.PI * 2 * i) / 16 + rand(-0.2, 0.2);
      const sp = rand(1.5, 4.5);
      sparks.push({
        x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        life: 1, color: SPARK_COLORS[Math.floor(rand(0, SPARK_COLORS.length))],
      });
    }
    planets.forEach((p) => {
      const dx = p.x - x, dy = p.y - y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 180) {
        const f = (1 - d / 180) * 4;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }
      if (d < p.r + 10) p.pulse = 1.3;
    });
  }

  function spawnShooter() {
    shooters.push({
      x: rand(0, w), y: rand(0, h * 0.4),
      vx: rand(5, 8), vy: rand(2, 4), life: 1,
    });
  }

  function update() {
    // stars
    stars.forEach((s) => {
      s.x += s.vx; s.y += s.vy; s.phase += s.speed;
      if (s.x < 0) s.x = w; if (s.x > w) s.x = 0;
      if (s.y < 0) s.y = h; if (s.y > h) s.y = 0;
    });

    // planets
    planets.forEach((p) => {
      if (pointer.active) {
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const d = Math.hypot(dx, dy) || 1;
        const range = p.r + 120;
        if (d < range) {
          const f = (1 - d / range) * 0.7;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }
      // ease back toward its slow drift
      p.vx += (p.bvx - p.vx) * 0.02;
      p.vy += (p.bvy - p.vy) * 0.02;
      p.x += p.vx; p.y += p.vy;
      p.pulse += (1 - p.pulse) * 0.08;
      p.moonAngle += 0.02;

      const m = p.r * 2;
      if (p.x < -m) p.x = w + m; if (p.x > w + m) p.x = -m;
      if (p.y < -m) p.y = h + m; if (p.y > h + m) p.y = -m;
    });

    sparks.forEach((s) => {
      s.x += s.vx; s.y += s.vy; s.vx *= 0.96; s.vy *= 0.96; s.life -= 0.025;
    });
    sparks = sparks.filter((s) => s.life > 0);

    ripples.forEach((r) => { r.r += 3.5; r.a -= 0.025; });
    ripples = ripples.filter((r) => r.a > 0);

    shooters.forEach((s) => { s.x += s.vx; s.y += s.vy; s.life -= 0.02; });
    shooters = shooters.filter((s) => s.life > 0);

    if (Math.random() < 0.003) spawnShooter();
  }

  function drawPlanet(p) {
    const r = p.r * p.pulse;
    if (p.ring) {
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 1.9, r * 0.55, p.tilt, Math.PI, Math.PI * 2);
      ctx.stroke();
    }

    const g = ctx.createRadialGradient(p.x - r * 0.4, p.y - r * 0.4, r * 0.1, p.x, p.y, r);
    g.addColorStop(0, p.c0);
    g.addColorStop(1, p.c1);
    ctx.shadowBlur = 22;
    ctx.shadowColor = p.c0;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (p.ring) {
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 1.9, r * 0.55, p.tilt, 0, Math.PI);
      ctx.stroke();
    }

    if (p.moon) {
      const mx = p.x + Math.cos(p.moonAngle) * r * 1.8;
      const my = p.y + Math.sin(p.moonAngle) * r * 1.0;
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(mx, my, Math.max(3, r * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // soft glow under the pointer
    if (pointer.active) {
      const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 70);
      g.addColorStop(0, "rgba(34,229,229,0.18)");
      g.addColorStop(1, "rgba(34,229,229,0)");
      ctx.fillStyle = g;
      ctx.fillRect(pointer.x - 70, pointer.y - 70, 140, 140);
    }

    // stars
    stars.forEach((s) => {
      let a = 0.35 + 0.65 * Math.abs(Math.sin(s.phase));
      let r = s.r;
      if (pointer.active) {
        const d = Math.hypot(s.x - pointer.x, s.y - pointer.y);
        if (d < 100) { a = 1; r = s.r * (1 + (1 - d / 100) * 1.5); }
      }
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // shooting stars
    shooters.forEach((s) => {
      const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 8, s.y - s.vy * 8);
      grad.addColorStop(0, `rgba(255,255,255,${s.life})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 8, s.y - s.vy * 8);
      ctx.stroke();
    });

    planets.forEach(drawPlanet);

    ripples.forEach((r) => {
      ctx.strokeStyle = `rgba(34,229,229,${r.a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    });

    sparks.forEach((s) => {
      ctx.globalAlpha = Math.max(s.life, 0);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function loop() {
    if (!document.hidden) { update(); draw(); }
    requestAnimationFrame(loop);
  }

  // Input
  window.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  });
  window.addEventListener("pointerdown", (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
    if (!reduceMotion) burst(e.clientX, e.clientY);
  });
  ["pointerup", "pointercancel"].forEach((ev) =>
    window.addEventListener(ev, (e) => { if (e.pointerType === "touch") pointer.active = false; })
  );
  document.addEventListener("pointerleave", () => { pointer.active = false; });
  window.addEventListener("resize", resize);

  resize();
  if (reduceMotion) { draw(); } else { loop(); }
})();