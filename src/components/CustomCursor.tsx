import { useEffect, useRef } from 'react';

const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, label, [role="button"]';

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reducedMotion) return;

    let targetX = -100;
    let targetY = -100;
    let ringX = -100;
    let ringY = -100;
    let isHovering = false;
    let isPressed = false;
    let visible = false;
    let rafId = 0;
    let animating = false;

    const applyRingTransform = () => {
      const ring = ringRef.current;
      if (!ring) return;
      const scale = isPressed ? 0.82 : isHovering ? 1.42 : 1;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${scale})`;
    };

    const step = () => {
      const dx = targetX - ringX;
      const dy = targetY - ringY;
      ringX += dx * 0.24;
      ringY += dy * 0.24;
      applyRingTransform();

      if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
        rafId = requestAnimationFrame(step);
      } else {
        ringX = targetX;
        ringY = targetY;
        applyRingTransform();
        animating = false;
      }
    };

    const ensureLoop = () => {
      if (!animating) {
        animating = true;
        rafId = requestAnimationFrame(step);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;

      targetX = e.clientX;
      targetY = e.clientY;

      if (!visible) {
        visible = true;
        ringX = targetX;
        ringY = targetY;
        document.documentElement.classList.add('custom-cursor-active');
        if (dotRef.current) dotRef.current.style.opacity = '1';
        if (ringRef.current) ringRef.current.style.opacity = '1';
      }

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%) scale(${isPressed ? 0.75 : 1})`;
      }

      const targetEl = e.target instanceof Element ? e.target : null;
      const nextHover = Boolean(targetEl?.closest(INTERACTIVE_SELECTOR));
      if (nextHover !== isHovering) {
        isHovering = nextHover;
        if (ringRef.current) {
          ringRef.current.dataset.hover = isHovering ? 'true' : 'false';
        }
      }

      ensureLoop();
    };

    const handlePointerDown = () => {
      isPressed = true;
      if (dotRef.current && visible) {
        dotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%) scale(0.75)`;
      }
      applyRingTransform();
    };

    const handlePointerUp = () => {
      isPressed = false;
      if (dotRef.current && visible) {
        dotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%) scale(1)`;
      }
      applyRingTransform();
    };

    const handleMouseLeave = () => {
      visible = false;
      if (dotRef.current) dotRef.current.style.opacity = '0';
      if (ringRef.current) ringRef.current.style.opacity = '0';
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(rafId);
      document.documentElement.classList.remove('custom-cursor-active');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[95] hidden md:block">
      <div
        ref={ringRef}
        data-hover="false"
        className="custom-cursor-ring fixed top-0 left-0 h-8 w-8 rounded-full border border-white/45 opacity-0 transition-[border-color,background-color,opacity] duration-150"
      />
      <div
        ref={dotRef}
        className="fixed top-0 left-0 h-2 w-2 rounded-full bg-ember shadow-[0_0_10px_rgba(255,77,97,0.85)] opacity-0 transition-opacity duration-150"
      />
    </div>
  );
}
