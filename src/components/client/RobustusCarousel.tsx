import { useCallback, useEffect, useRef, useState } from "react";

import robustusLogo from "@/assets/sponsors/robustus/logo.png";
import bannerLifeSpecial from "@/assets/sponsors/robustus/banner-life-special.jpg";
import bannerMais from "@/assets/sponsors/robustus/banner-mais.jpg";
import bannerDiaADia from "@/assets/sponsors/robustus/banner-dia-a-dia.jpg";
import bannerOndeComprar from "@/assets/sponsors/robustus/banner-onde-comprar.jpg";
import bannerInstitucional from "@/assets/sponsors/robustus/banner-institucional.jpg";

type Slide = {
  image: string;
  title: string;
  cta: string;
  href: string;
  alt: string;
};

const SLIDES: Slide[] = [
  {
    image: bannerLifeSpecial,
    title: "Nutrição especial para quem faz parte da família",
    cta: "Conhecer a linha",
    href: "https://robustus.com.br/life-special/",
    alt: "Robustus Life Special",
  },
  {
    image: bannerMais,
    title: "Mais sabor e cuidado todos os dias",
    cta: "Ver produtos",
    href: "https://robustus.com.br/mais/",
    alt: "Robustus +Mais",
  },
  {
    image: bannerDiaADia,
    title: "Nutrição completa para a rotina do seu pet",
    cta: "Conhecer",
    href: "https://robustus.com.br/dia-a-dia/",
    alt: "Robustus Dia a Dia",
  },
  {
    image: bannerOndeComprar,
    title: "Encontre Robustus perto de você",
    cta: "Onde comprar",
    href: "https://robustus.com.br/onde-comprar",
    alt: "Onde comprar Robustus",
  },
  {
    image: bannerInstitucional,
    title: "Cuidamos com amor da nutrição do seu pet",
    cta: "Conheça a Robustus",
    href: "https://robustus.com.br/sobre-nos/",
    alt: "Sobre a Robustus",
  },
];

const SLIDE_MS = 5500;
const TICK_MS = 50;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function RobustusCarousel() {
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [dragX, setDragX] = useState(0);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const widthRef = useRef(1);
  const pausedRef = useRef(false);
  const reducedMotion = useRef(prefersReducedMotion());
  const idxRef = useRef(idx);
  idxRef.current = idx;

  const goTo = useCallback((next: number) => {
    setIdx(((next % SLIDES.length) + SLIDES.length) % SLIDES.length);
    setProgress(0);
  }, []);

  // Preload current + next (lazy strategy)
  useEffect(() => {
    [idx, (idx + 1) % SLIDES.length].forEach((i) => {
      if (loaded[i] || failed[i]) return;
      const img = new Image();
      img.src = SLIDES[i].image;
      img.onload = () => setLoaded((m) => ({ ...m, [i]: true }));
      img.onerror = () => setFailed((m) => ({ ...m, [i]: true }));
    });
  }, [idx, loaded, failed]);

  // Auto-advance
  useEffect(() => {
    if (reducedMotion.current) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      if (pausedRef.current || document.hidden) {
        last = performance.now();
        return;
      }
      const now = performance.now();
      const dt = now - last;
      last = now;
      setProgress((p) => {
        const np = p + dt / SLIDE_MS;
        if (np >= 1) {
          setIdx((i) => (i + 1) % SLIDES.length);
          return 0;
        }
        return np;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onVis = () => {
      pausedRef.current = document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    pausedRef.current = true;
    startXRef.current = e.clientX;
    widthRef.current = e.currentTarget.clientWidth || 1;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setDragX(e.clientX - startXRef.current);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const dx = e.clientX - startXRef.current;
    const threshold = Math.min(60, widthRef.current * 0.15);
    setDragX(0);
    if (dx <= -threshold) goTo(idxRef.current + 1);
    else if (dx >= threshold) goTo(idxRef.current - 1);
    pausedRef.current = false;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const open = (href: string) => {
    if (typeof window === "undefined") return;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="px-4">
      <div
        className="relative w-full overflow-hidden rounded-[8px] bg-[#0A8FD6] shadow-sm select-none"
        style={{ aspectRatio: "16 / 9", touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => {
          if (!draggingRef.current) pausedRef.current = false;
        }}
      >
        <div
          className="absolute inset-0 flex"
          style={{
            transform: `translate3d(calc(${-idx * 100}% + ${dragX}px), 0, 0)`,
            transition: draggingRef.current
              ? "none"
              : "transform 400ms cubic-bezier(0.22,0.61,0.36,1)",
          }}
        >
          {SLIDES.map((s, i) => {
            const shouldLoad = i === idx || i === (idx + 1) % SLIDES.length || loaded[i];
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (Math.abs(dragX) < 4) open(s.href);
                }}
                className="relative h-full w-full flex-shrink-0 text-left"
                aria-label={`${s.alt} — ${s.cta}`}
              >
                {/* Brand fallback background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0A8FD6] to-[#0B6AB0]" />
                {shouldLoad && !failed[i] && (
                  <img
                    src={s.image}
                    alt={s.alt}
                    draggable={false}
                    loading={i === 0 ? "eager" : "lazy"}
                    onLoad={() => setLoaded((m) => ({ ...m, [i]: true }))}
                    onError={() => setFailed((m) => ({ ...m, [i]: true }))}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                {/* Left-side contrast overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#072F4D]/85 via-[#0A4F7E]/55 to-transparent" />
                {/* Sponsored chip */}
                <span className="absolute right-2 top-2 rounded bg-black/45 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/95">
                  Patrocinado
                </span>
                <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
                  <img
                    src={robustusLogo}
                    alt="Robustus"
                    className="h-5 w-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] sm:h-6"
                  />
                  <div className="max-w-[68%]">
                    <h3 className="text-[15px] font-bold leading-tight text-white drop-shadow-sm sm:text-base">
                      {s.title}
                    </h3>
                    <span className="mt-2 inline-flex w-fit items-center rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0A4F7E] shadow-sm sm:text-xs">
                      {s.cta}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress bars */}
        <div className="pointer-events-auto absolute bottom-1.5 left-4 right-4 flex gap-1">
          {SLIDES.map((_, i) => {
            const fill = i < idx ? 1 : i === idx ? progress : 0;
            return (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(i);
                }}
                className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-white/35"
                aria-label={`Ir para banner ${i + 1}`}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-white"
                  style={{
                    width: `${Math.max(0, Math.min(1, fill)) * 100}%`,
                    transition:
                      i === idx && !draggingRef.current ? "width 50ms linear" : "none",
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RobustusCarousel;