import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_FLIP, spreadLabels } from './book/pages';
import { links, profile } from './data';

const BookScene = lazy(() => import('./book/BookScene'));

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// Portrait screens (phones, upright tablets) show one page at a time.
function usePortrait() {
  const get = () => typeof window !== 'undefined' && window.innerWidth / window.innerHeight < 0.8;
  const [portrait, setPortrait] = useState(get);
  useEffect(() => {
    const onResize = () => setPortrait(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return portrait;
}

function Header({ onHome }) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:py-6">
      <button
        onClick={onHome}
        className="pointer-events-auto flex items-center gap-2.5 text-sm font-semibold tracking-tight sm:text-[15px]"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-stone-100 font-serif text-sm font-bold text-stone-950">B</span>
        baron betazara
      </button>
      <a
        href="mailto:baronbetazara@gmail.com"
        className="pointer-events-auto rounded-md bg-stone-100 px-3 py-2 text-xs font-semibold sm:px-4 text-stone-950 transition-transform hover:-translate-y-0.5"
      >
        Get in Touch
      </a>
    </header>
  );
}

// Shown only when the browser cannot render WebGL.
function NoWebGL() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-[#070606] px-6 text-center text-stone-300">
      <Header onHome={() => {}} />
      <div className="max-w-md">
        <h1 className="font-serif text-3xl text-stone-100">{profile.name}</h1>
        <p className="mt-3 text-sm text-stone-400">{profile.summary}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="underline underline-offset-4 hover:text-stone-100">
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  const webgl = useMemo(hasWebGL, []);
  const portrait = usePortrait();
  const [flipped, setFlipped] = useState(0);
  // which page of the open spread is framed in portrait mode
  const [focus, setFocus] = useState('left');
  const state = useRef({ flipped, focus, portrait });
  state.current = { flipped, focus, portrait };

  const next = useCallback(() => {
    const { flipped: f, focus: side, portrait: p } = state.current;
    if (p && f > 0 && side === 'left') return setFocus('right');
    if (f >= MAX_FLIP) return;
    setFlipped(f + 1);
    setFocus('left');
  }, []);
  const prev = useCallback(() => {
    const { flipped: f, focus: side, portrait: p } = state.current;
    if (p && f > 0 && side === 'right') return setFocus('left');
    if (f <= 0) return;
    setFlipped(f - 1);
    setFocus('right');
  }, []);
  const goTo = useCallback((i) => {
    setFlipped(i);
    setFocus('left');
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') goTo(0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, goTo]);

  // horizontal swipe turns pages on touch screens
  const touch = useRef(null);
  const swiped = useRef(0);
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      swiped.current = performance.now();
      if (dx < 0) next();
      else prev();
    }
  };
  // a swipe also ends with a tap on the page; ignore that tap
  const onBookNext = useCallback(() => {
    if (performance.now() - swiped.current > 400) next();
  }, [next]);
  const onBookPrev = useCallback(() => {
    if (performance.now() - swiped.current > 400) prev();
  }, [prev]);

  const atStart = flipped === 0;
  const atEnd = flipped === MAX_FLIP && (!portrait || focus === 'right');

  if (!webgl) return <NoWebGL />;

  return (
    <div
      className="fixed inset-0 touch-pan-y overflow-hidden bg-[#070606] text-stone-100 select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-sm text-stone-500">Loading…</div>}>
        <BookScene flipped={flipped} focus={focus} portrait={portrait} onNext={onBookNext} onPrev={onBookPrev} />
      </Suspense>

      <Header onHome={() => goTo(0)} />
      <p className="sr-only">
        {profile.name}, {profile.roles[0]}. {profile.summary}
      </p>

      <nav className="absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] flex items-center justify-center gap-4 text-stone-300 sm:bottom-7 sm:gap-5">
        <button
          onClick={prev}
          disabled={atStart}
          aria-label="Previous page"
          className="grid h-11 w-11 place-items-center rounded-full border border-stone-700 sm:h-9 sm:w-9 transition hover:border-stone-300 disabled:opacity-30"
        >
          ‹
        </button>
        <div className="flex min-w-[150px] flex-col items-center gap-2 sm:min-w-[180px]">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-stone-400">{spreadLabels[flipped]}</span>
          <div className="flex gap-1.5">
            {spreadLabels.map((label, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to ${label}`}
                className={`h-2 rounded-full transition-all sm:h-1.5 ${i === flipped ? 'w-6 bg-stone-100' : 'w-2 sm:w-1.5 bg-stone-600 hover:bg-stone-400'}`}
              />
            ))}
          </div>
        </div>
        <button
          onClick={next}
          disabled={atEnd}
          aria-label="Next page"
          className="grid h-11 w-11 place-items-center rounded-full border border-stone-700 sm:h-9 sm:w-9 transition hover:border-stone-300 disabled:opacity-30"
        >
          ›
        </button>
      </nav>
    </div>
  );
}

export default App;
