import { useEffect, useRef } from "react";

/* cubic-bezier(0.22, 1, 0.36, 1) solved in JS so the digits ride the same curve the
   bars grow on — one clock, one easing, never two timelines. */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  return function ease(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i += 1) {
      const d = ((ax * t + bx) * t + cx) * t - x;
      if (Math.abs(d) < 1e-4) break;
      const s = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(s) < 1e-5) break;
      t -= d / s;
    }
    return ((ay * t + by) * t + cy) * t;
  };
}
const ease = bezier(0.22, 1, 0.36, 1);

const STAGGER = 90;
const DELAY = 140;
const BAR = 900;
const COUNT = 640;

/** One-shot entrance for the breakdown list: bars grow and digits count on one clock. */
export default function useRevealBars() {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const rows = [...root.querySelectorAll("[data-mbrk-row]")];
    if (!rows.length) return;

    const fills = rows.map((row) => row.querySelector(".mbrk-fill"));
    const nums = rows.map((row) => row.querySelector(".mbrk-num"));
    const targets = nums.map((num) => Number(num?.dataset.value || 0));
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (still || !("IntersectionObserver" in window) || !window.requestAnimationFrame) return;

    let frame = 0;
    let done = false;

    const finish = () => {
      done = true;
      fills.forEach((fill) => fill && (fill.style.transform = ""));
      nums.forEach((num) => {
        if (!num) return;
        num.textContent = Math.round(Number(num.dataset.value || 0)).toLocaleString("en-PH");
      });
      root.removeAttribute("data-mbrk-run");
      root.removeAttribute("data-mbrk-armed");
    };

    const play = () => {
      root.setAttribute("data-mbrk-run", "");
      let start = 0;
      const step = (now) => {
        if (!start) start = now;
        const elapsed = now - start;
        rows.forEach((_, i) => {
          const at = i * STAGGER + DELAY;
          const p = Math.min(1, Math.max(0, (elapsed - at) / BAR));
          const pc = Math.min(1, Math.max(0, (elapsed - at) / COUNT));
          if (fills[i]) fills[i].style.transform = `scaleX(${ease(p)})`;
          if (nums[i]) nums[i].textContent = Math.round(targets[i] * ease(pc)).toLocaleString("en-PH");
        });
        if (elapsed < rows.length * STAGGER + DELAY + BAR) frame = requestAnimationFrame(step);
        else finish();
      };
      frame = requestAnimationFrame(step);
    };

    root.setAttribute("data-mbrk-armed", "");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          observer.disconnect();
          play();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(root);

    const bail = () => {
      if (!done && document.visibilityState === "hidden") {
        observer.disconnect();
        finish();
      }
    };
    const timer = setTimeout(bail, 700);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);

  return ref;
}