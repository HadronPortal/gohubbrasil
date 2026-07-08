import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import bannerBarbearia from "@/assets/banners/banner-barbearia.webp";
import bannerCabelos from "@/assets/banners/banner-cabelos.webp";
import bannerUnhas from "@/assets/banners/banner-unhas.webp";
import bannerEstetica from "@/assets/banners/banner-estetica.webp";
import bannerMassoterapia from "@/assets/banners/banner-massoterapia.webp";

type Slide = {
  image: string;
  title: string;
  text: string;
  cta: string;
  to: string;
  alt: string;
};

const SLIDES: Slide[] = [
  {
    image: bannerBarbearia,
    title: "Seu estilo, no seu horário",
    text: "Encontre barbearias perto de você",
    cta: "Agendar corte",
    to: "/client-category/barbearias",
    alt: "Profissional realizando corte em estabelecimento moderno",
  },
  {
    image: bannerCabelos,
    title: "Cabelos do seu jeito",
    text: "Cortes, escovas e tratamentos",
    cta: "Encontrar salão",
    to: "/client-category/cabelos",
    alt: "Salão feminino moderno com tratamento capilar",
  },
  {
    image: bannerUnhas,
    title: "Detalhes que fazem diferença",
    text: "Manicure, pedicure e alongamento",
    cta: "Cuidar das unhas",
    to: "/client-category/unhas",
    alt: "Estação de manicure com esmaltes e pincéis",
  },
  {
    image: bannerEstetica,
    title: "Seu momento de autocuidado",
    text: "Estética facial e corporal",
    cta: "Ver tratamentos",
    to: "/client-category/estetica",
    alt: "Sala de estética clara com maca e toalhas",
  },
  {
    image: bannerMassoterapia,
    title: "Desacelere e cuide de você",
    text: "Massagens e terapias perto de você",
    cta: "Relaxar agora",
    to: "/client-category/massoterapia",
    alt: "Sala de massagem tranquila com velas e pedras",
  },
];

const SLIDE_MS = 5000;
const TICK_MS = 50;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function PromoCarousel() {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 for current slide
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
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

  // Preload next image
  useEffect(() => {
    const next = (idx + 1) % SLIDES.length;
    if (loaded[next]) return;
    const img = new Image();
    img.src = SLIDES[next].image;
    img.onload = () => setLoaded((m) => ({ ...m, [next]: true }));
  }, [idx, loaded]);

  // Progress ticker
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

  // Pause when tab hidden
  useEffect(() => {
    const onVis = () => {
      pausedRef.current = document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Touch / pointer drag
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

  const slide = SLIDES[idx];

  return (
    <div className="px-4">
      <div
        className="relative w-full overflow-hidden rounded-[8px] bg-slate-200 shadow-sm select-none"
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
        {/* Skeleton until current image loads */}
        {!loaded[idx] && (
          <div className="absolute inset-0 animate-pulse bg-slate-200" />
        )}

        {/* Slide track */}
        <div
          className="absolute inset-0 flex"
          style={{
            transform: `translate3d(calc(${-idx * 100}% + ${dragX}px), 0, 0)`,
            transition: draggingRef.current ? "none" : "transform 400ms cubic-bezier(0.22,0.61,0.36,1)",
          }}
        >
          {SLIDES.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (Math.abs(dragX) < 4) navigate(s.to);
              }}
              className="relative h-full w-full flex-shrink-0 text-left"
              aria-label={`${s.title} — ${s.cta}`}
            >
              <img
                src={s.image}
                alt={s.alt}
                draggable={false}
                loading={i === 0 ? "eager" : "lazy"}
                onLoad={() => setLoaded((m) => ({ ...m, [i]: true }))}
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-black/10" />
              {/* Text content */}
              <div className="absolute inset-0 flex flex-col justify-center gap-2 p-5 pr-6 text-white sm:p-7">
                <h3 className="max-w-[70%] text-xl font-bold leading-tight drop-shadow-sm sm:text-2xl">
                  {s.title}
                </h3>
                <p className="max-w-[70%] text-xs font-medium opacity-95 sm:text-sm">
                  {s.text}
                </p>
                <span className="mt-1 inline-flex w-fit items-center rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-[#172033] shadow-sm sm:text-sm">
                  {s.cta}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Progress bars */}
        <div
          className="pointer-events-auto absolute bottom-2.5 left-5 right-5 flex gap-1.5"
          aria-hidden={false}
        >
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
                className="group relative h-1 flex-1 overflow-hidden rounded-full bg-white/35"
                aria-label={`Ir para banner ${i + 1}`}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-white"
                  style={{
                    width: `${Math.max(0, Math.min(1, fill)) * 100}%`,
                    transition: i === idx && !draggingRef.current ? "width 50ms linear" : "none",
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

export default PromoCarousel;