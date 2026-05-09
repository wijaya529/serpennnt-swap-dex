import { useEffect, useRef } from "react";

/**
 * Premium animated DeFi background:
 * - Glowing snake silhouette slithering on a sine path
 * - Floating particles
 * - Soft moving gradient ambient light
 * Pointer-events disabled, fixed full-screen, low opacity.
 */
export function SnakeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // particles
    const particles = Array.from({ length: 36 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      a: Math.random() * 0.5 + 0.2,
    }));

    type Snake = {
      phase: number;
      speed: number;
      amp: number;
      freq: number;
      yBase: number;
      length: number;
      thickness: number;
      hueShift: number;
      direction: 1 | -1;
    };
    const snakes: Snake[] = [
      { phase: 0, speed: 0.0009, amp: 90, freq: 0.006, yBase: 0.35, length: 320, thickness: 14, hueShift: 0, direction: 1 },
      { phase: Math.PI, speed: 0.0007, amp: 130, freq: 0.0045, yBase: 0.7, length: 380, thickness: 18, hueShift: 10, direction: -1 },
      { phase: Math.PI / 2, speed: 0.00055, amp: 70, freq: 0.008, yBase: 0.55, length: 260, thickness: 10, hueShift: -8, direction: 1 },
    ];

    let sparkleAt = 0;

    const drawSnake = (t: number, s: Snake) => {
      const segments = 60;
      const yCenter = height * s.yBase;
      const progress = (t * s.speed) % 1.4 - 0.2; // travels across with wrap
      const headX = s.direction === 1 ? progress * (width + s.length) - s.length / 2 : width - (progress * (width + s.length)) + s.length / 2;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < segments; i++) {
        const ratio = i / segments;
        const x = headX - s.direction * ratio * s.length;
        const y = yCenter + Math.sin(x * s.freq + s.phase + t * 0.001) * s.amp;

        const taper = Math.sin(ratio * Math.PI) * 0.85 + 0.15;
        const radius = s.thickness * taper;

        const alpha = (1 - ratio) * 0.55;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, radius * 6);
        grd.addColorStop(0, `hsla(${158 + s.hueShift}, 90%, 65%, ${alpha})`);
        grd.addColorStop(0.4, `hsla(${158 + s.hueShift}, 90%, 50%, ${alpha * 0.35})`);
        grd.addColorStop(1, "hsla(158, 90%, 40%, 0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y, radius * 6, 0, Math.PI * 2);
        ctx.fill();

        // core body
        ctx.fillStyle = `hsla(${160 + s.hueShift}, 95%, 70%, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // glowing eyes on the head
        if (i === 0) {
          const eyeOffset = s.direction;
          ctx.fillStyle = `hsla(80, 100%, 75%, 0.95)`;
          ctx.beginPath();
          ctx.arc(x + eyeOffset * 4, y - 3, 1.6, 0, Math.PI * 2);
          ctx.arc(x + eyeOffset * 4, y + 3, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };

    const drawAmbient = (t: number) => {
      // moving radial light
      const cx = width * (0.5 + Math.sin(t * 0.0002) * 0.25);
      const cy = height * (0.5 + Math.cos(t * 0.00017) * 0.2);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.6);
      grd.addColorStop(0, "hsla(160, 90%, 45%, 0.08)");
      grd.addColorStop(1, "hsla(160, 90%, 45%, 0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, width, height);
    };

    const drawParticles = () => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 8);
        grd.addColorStop(0, `hsla(160, 95%, 70%, ${p.a * 0.5})`);
        grd.addColorStop(1, "hsla(160, 95%, 70%, 0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawSparkle = (t: number) => {
      if (t - sparkleAt > 3500 + Math.random() * 2500) {
        sparkleAt = t;
      }
      const since = t - sparkleAt;
      if (since < 900) {
        const a = Math.sin((since / 900) * Math.PI) * 0.18;
        ctx.fillStyle = `hsla(160, 95%, 60%, ${a})`;
        ctx.fillRect(0, 0, width, height);
      }
    };

    const tick = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      drawAmbient(t);
      drawParticles();
      for (const s of snakes) drawSnake(t, s);
      drawSparkle(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ filter: "blur(0.4px)" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ opacity: 0.55, mixBlendMode: "screen" }}
      />
      {/* soft fog overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 30%, oklch(0.22 0.04 180 / 0.35), transparent 70%), radial-gradient(40% 30% at 80% 80%, oklch(0.28 0.06 165 / 0.25), transparent 70%)",
        }}
      />
      {/* vignette to keep UI readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, oklch(0.14 0.02 180 / 0.55) 100%)",
        }}
      />
    </div>
  );
}
