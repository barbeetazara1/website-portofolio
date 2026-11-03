import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { sides, LEAF_COUNT, PW, PH, hitLink, drawFoilMap } from './pages';

// ─── dimensions (world units) ─────────────────────────────────────────
const W = 3.2; // page width (landscape)
const H = 2.1; // page height
const CW = W + 0.08; // hard cover board, overhangs the pages at the fore-edge
const CH = H + 0.16; // ...and at head and tail
const CT = 0.04; // board thickness
const DESK = -0.06; // desk surface
const BASE = DESK + CT; // top of the back board, where the page block starts
const PAPER = 4; // paper leaves between the covers (leaf 1..4)
const Q = 0.026; // block thickness represented by one paper leaf
const DIP = 0.05; // how far open pages sink into the gutter
const LAMBDA = 0.075; // width of the gutter curve, as a fraction of W
const SEG = 40; // segments across a page
const FLIP_TIME = 0.95; // seconds per page turn
const STAGGER = 0.11; // delay between leaves when several turn at once
const LAST = LEAF_COUNT - 1; // leaf 0 is the front cover, the last leaf is the back board

const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

// ─── geometry ─────────────────────────────────────────────────────────
// A strip lying in the XZ plane from the spine (x = 0) to x = w.
function makeStrip(w, h, seg) {
  const cols = seg + 1;
  const pos = new Float32Array(cols * 2 * 3);
  const uv = new Float32Array(cols * 2 * 2);
  for (let i = 0; i < cols; i++) {
    const u = i / seg;
    for (let j = 0; j < 2; j++) {
      const k = i * 2 + j;
      pos.set([u * w, 0, j === 0 ? -h / 2 : h / 2], k * 3);
      uv.set([u, j === 0 ? 1 : 0], k * 2);
    }
  }
  const index = [];
  for (let i = 0; i < seg; i++) {
    const a = i * 2,
      c = i * 2 + 1,
      b = a + 2,
      d = c + 2;
    index.push(a, c, b, b, c, d); // wound so the front faces +Y
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

// Cross-section of a page: angle per segment, integrated from the spine.
// e: turn progress (0 resting right, 1 resting left), curl: lag of the free
// edge while turning, dip: how deep the page root sits in the gutter.
const XS = new Float32Array(SEG + 1);
const YS = new Float32Array(SEG + 1);
function profile(e, curl, dip, y0) {
  const theta0 = e * Math.PI;
  const rise = 1 - 2 * e; // gutter curve points up on both sides
  const g = dip > 0 ? dip / (LAMBDA * W * (1 - Math.exp(-1 / LAMBDA))) : 0;
  const dx = W / SEG;
  let x = 0;
  let y = y0 - dip;
  XS[0] = 0;
  YS[0] = y;
  for (let i = 1; i <= SEG; i++) {
    const u = (i - 0.5) / SEG;
    const th = theta0 - curl * u + g * Math.exp(-u / LAMBDA) * rise;
    x += Math.cos(th) * dx;
    y += Math.sin(th) * dx;
    XS[i] = x;
    YS[i] = y;
  }
}

function writeLeaf(geom) {
  const pos = geom.attributes.position.array;
  for (let i = 0; i <= SEG; i++) {
    pos[i * 6] = pos[i * 6 + 3] = XS[i];
    pos[i * 6 + 1] = pos[i * 6 + 4] = YS[i];
  }
  geom.attributes.position.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
}

// Page block: the two side walls (head/tail) follow the curved top page,
// plus the fore-edge. The top is covered by the topmost page itself.
const EDGE_REPEAT = 11; // stripes texture repeats per world unit of height
function makeBlock() {
  const n = (SEG + 1) * 2 * 2 + 4;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  const index = [];
  for (let s = 0; s < 2; s++) {
    const b = s * (SEG + 1) * 2;
    for (let i = 0; i < SEG; i++) {
      const t0 = b + i * 2,
        b0 = t0 + 1,
        t1 = t0 + 2,
        b1 = t0 + 3;
      index.push(t0, b0, t1, t1, b0, b1);
    }
  }
  const e = (SEG + 1) * 4;
  index.push(e, e + 1, e + 2, e + 2, e + 1, e + 3);
  g.setIndex(index);
  return g;
}

function writeBlock(geom, inset) {
  const pos = geom.attributes.position.array;
  const uv = geom.attributes.uv.array;
  let k = 0;
  const put = (x, y, z, u, v) => {
    pos.set([x, y, z], k * 3);
    uv.set([u, v], k * 2);
    k++;
  };
  for (const z of [H / 2 - inset, -H / 2 + inset]) {
    for (let i = 0; i <= SEG; i++) {
      const top = Math.max(BASE, YS[i] - 0.003);
      put(XS[i], top, z, i / SEG, (top - BASE) * EDGE_REPEAT);
      put(XS[i], BASE, z, i / SEG, 0);
    }
  }
  const xe = XS[SEG];
  const ye = Math.max(BASE, YS[SEG] - 0.003);
  put(xe, ye, H / 2 - inset, 0, (ye - BASE) * EDGE_REPEAT);
  put(xe, BASE, H / 2 - inset, 0, 0);
  put(xe, ye, -H / 2 + inset, 1, (ye - BASE) * EDGE_REPEAT);
  put(xe, BASE, -H / 2 + inset, 1, 0);
  geom.attributes.position.needsUpdate = true;
  geom.attributes.uv.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingSphere();
}

// ─── procedural textures ──────────────────────────────────────────────
function canvasTexture(size, paint, { srgb = false, repeat = [1, 1] } = {}) {
  const c = document.createElement('canvas');
  c.width = Array.isArray(size) ? size[0] : size;
  c.height = Array.isArray(size) ? size[1] : size;
  paint(c.getContext('2d'), c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 8;
  return tex;
}

function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

function useMaterials(gl) {
  return useMemo(() => {
    const aniso = gl.capabilities.getMaxAnisotropy();

    // fine paper fibre for bump
    const paperBump = canvasTexture(
      256,
      (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        const rnd = seeded(11);
        for (let i = 0; i < w * h; i++) {
          const v = 110 + rnd() * 50;
          img.data.set([v, v, v, 255], i * 4);
        }
        ctx.putImageData(img, 0, 0);
        ctx.globalAlpha = 0.25;
        for (let i = 0; i < 260; i++) {
          ctx.strokeStyle = rnd() > 0.5 ? '#fff' : '#000';
          ctx.lineWidth = 0.6;
          const x = rnd() * w,
            y = rnd() * h,
            a = rnd() * Math.PI;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
          ctx.stroke();
        }
      },
      { repeat: [7, 5] },
    );

    // pebbled leather / bookcloth grain for the boards
    const leather = canvasTexture(
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, w, h);
        const rnd = seeded(5);
        for (let i = 0; i < 9000; i++) {
          const r = 1 + rnd() * 2.6;
          const v = Math.floor(100 + rnd() * 70);
          ctx.fillStyle = `rgb(${v},${v},${v})`;
          ctx.beginPath();
          ctx.arc(rnd() * w, rnd() * h, r, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      { repeat: [3, 2] },
    );

    // stacked sheet edges, seen on the sides of the page block
    const edges = canvasTexture(
      [16, 64],
      (ctx, w, h) => {
        ctx.fillStyle = '#ece5d6';
        ctx.fillRect(0, 0, w, h);
        const rnd = seeded(3);
        for (let y = 0; y < h; y += 4) {
          const v = 196 + Math.floor(rnd() * 26);
          ctx.fillStyle = `rgb(${v},${v - 6},${v - 18})`;
          ctx.fillRect(0, y, w, 1);
        }
      },
      { srgb: true },
    );
    edges.anisotropy = aniso;

    // silver foil stamp: roughness (G) + metalness (B)
    const foil = canvasTexture([PW, PH], drawFoilMap);
    foil.wrapS = foil.wrapT = THREE.ClampToEdgeWrapping;

    // soft contact shadow under the book
    const contact = canvasTexture([512, 256], (ctx, w, h) => {
      ctx.shadowColor = 'rgba(0,0,0,1)';
      ctx.shadowBlur = 36;
      ctx.shadowOffsetX = w; // draw the shape off-canvas, keep only its shadow
      ctx.fillStyle = '#000';
      ctx.fillRect(-w + 40, 36, w - 80, h - 72);
    });
    contact.wrapS = contact.wrapT = THREE.ClampToEdgeWrapping;

    const cloth = new THREE.MeshStandardMaterial({
      color: '#151517',
      roughness: 0.78,
      bumpMap: leather,
      bumpScale: 1.2,
    });
    const block = new THREE.MeshStandardMaterial({
      map: edges,
      roughness: 0.95,
      side: THREE.DoubleSide,
    });

    return { paperBump, leather, edges, foil, contact, cloth, block };
  }, [gl]);
}

function usePageTextures(gl) {
  return useMemo(() => {
    const aniso = gl.capabilities.getMaxAnisotropy();
    return sides.map((_, s) => {
      const canvas = document.createElement('canvas');
      canvas.width = PW;
      canvas.height = PH;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = aniso;
      if (s % 2 === 1) {
        // back faces are seen mirrored, flip the texture back
        tex.repeat.set(-1, 1);
        tex.offset.set(1, 0);
      }
      return { canvas, ctx: canvas.getContext('2d'), tex };
    });
  }, [gl]);
}

// ─── book ─────────────────────────────────────────────────────────────
function Book({ flipped, onNext, onPrev, tapNext }) {
  const { gl, clock } = useThree();
  const textures = usePageTextures(gl);
  const mats = useMaterials(gl);
  const group = useRef();
  const cover = useRef();
  const spine = useRef();
  const contact = useRef();
  const blockR = useRef();
  const blockL = useRef();
  const leafMeshes = useRef([]);
  const assets = useRef({ photo: null });
  const hover = useRef({ side: -1, link: -1 });
  const hoverAmt = useRef(sides.map(() => 0));
  const dirty = useRef(sides.map(() => true));
  const settle = useRef(4); // frames left to rebuild geometry / shadows after motion

  const geo = useMemo(
    () => ({
      board: makeStrip(CW, CH, 1),
      leaves: Array.from({ length: PAPER }, () => makeStrip(W, H, SEG)),
      blockR: makeBlock(),
      blockL: makeBlock(),
    }),
    [],
  );
  const leaves = useRef(
    Array.from({ length: LEAF_COUNT }, () => ({
      p: 0,
      target: 0,
      dir: 1,
      startAt: 0,
    })),
  );

  const redraw = (s, t) => {
    const { ctx, tex } = textures[s];
    ctx.clearRect(0, 0, PW, PH);
    sides[s].draw(ctx, {
      h: hoverAmt.current[s],
      t,
      link: hover.current.side === s ? hover.current.link : -1,
      assets: assets.current,
    });
    tex.needsUpdate = true;
  };

  // load fonts + photo, then repaint everything
  useEffect(() => {
    let alive = true;
    const markAll = () => {
      if (alive) dirty.current = sides.map(() => true);
    };
    Promise.all([
      document.fonts.load('600 40px "Playfair Display"'),
      document.fonts.load('500 20px Inter'),
      document.fonts.load('600 56px Inter'),
      document.fonts.load('500 20px "Fira Code"'),
    ])
      .catch(() => {})
      .then(() => {
        markAll();
        // the foil map shares the cover layout, so repaint it with the real font too
        const ctx = mats.foil.image.getContext('2d');
        drawFoilMap(ctx);
        mats.foil.needsUpdate = true;
      });
    const img = new Image();
    img.onload = () => {
      assets.current.photo = img;
      markAll();
    };
    img.src = '/profile.jpg';
    return () => {
      alive = false;
    };
  }, [mats]);

  // schedule leaf targets whenever the requested spread changes
  useEffect(() => {
    const now = clock.getElapsedTime();
    const changing = [];
    leaves.current.forEach((leaf, i) => {
      const target = i < flipped ? 1 : 0;
      if (leaf.target !== target) changing.push([leaf, target]);
    });
    // turning forward: lowest index first; backward: highest first
    const forward = changing.length && changing[0][1] === 1;
    if (!forward) changing.reverse();
    changing.forEach(([leaf, target], order) => {
      leaf.target = target;
      leaf.dir = target === 1 ? 1 : -1;
      leaf.startAt = now + order * STAGGER;
    });
  }, [flipped, clock]);

  useEffect(
    () => () => {
      document.body.style.cursor = '';
      [geo.board, geo.blockR, geo.blockL, ...geo.leaves].forEach((g) => g.dispose());
      textures.forEach((t) => t.tex.dispose());
      Object.values(mats).forEach((m) => m.dispose && m.dispose());
    },
    [geo, textures, mats],
  );

  useFrame((state, dt) => {
    const t = state.clock.getElapsedTime();
    const step = Math.min(dt, 0.1) / FLIP_TIME; // keep turn speed on low-fps devices
    const L = leaves.current;

    let moving = false;
    L.forEach((leaf) => {
      if (leaf.p !== leaf.target) moving = true;
      if (t >= leaf.startAt && leaf.p !== leaf.target) {
        leaf.p = leaf.target > leaf.p ? Math.min(leaf.target, leaf.p + step) : Math.max(leaf.target, leaf.p - step);
      }
    });
    if (moving) settle.current = 4;
    const rebuild = settle.current > 0;
    if (rebuild) {
      settle.current -= 1;
      // the shadow map only changes while the book moves (see onCreated)
      state.gl.shadowMap.needsUpdate = true;
    }

    // front cover: a rigid board hinged at the spine
    const open = easeInOut(L[0].p);
    const closedTop = BASE + PAPER * Q + 0.004;
    if (cover.current) {
      cover.current.position.y = closedTop + (BASE - closedTop) * open;
      cover.current.rotation.z = open * Math.PI;
    }
    if (spine.current) {
      const top = closedTop + CT + (BASE - closedTop - CT) * open;
      spine.current.scale.y = Math.max(0.001, top - DESK);
      spine.current.position.y = (top + DESK) / 2;
    }

    if (rebuild) {
      // paper leaves
      let rightN = 0;
      let leftN = 0;
      for (let k = 0; k < PAPER; k++) {
        const leaf = L[k + 1];
        const e = easeInOut(leaf.p);
        rightN += 1 - smooth(0, 0.15, leaf.p);
        leftN += smooth(0.85, 1, leaf.p);
        const yR = BASE + (PAPER - k) * Q;
        const yL = BASE + (k + 1) * Q;
        const dR = Math.min(DIP, (yR - BASE) * 0.7) * open;
        const dL = Math.min(DIP, (yL - BASE) * 0.7) * open;
        const curl = Math.sin(e * Math.PI) * 0.75 * leaf.dir;
        profile(e, curl, dR + (dL - dR) * e, yR + (yL - yR) * e);
        writeLeaf(geo.leaves[k]);
        const m = leafMeshes.current[k];
        if (m) m.castShadow = leaf.p !== leaf.target || (leaf.p > 0 && leaf.p < 1);
      }

      // page blocks follow the topmost resting page on each side
      const block = (mesh, g, n, e) => {
        if (!mesh) return;
        const top = BASE + n * Q;
        mesh.visible = n > 0.05;
        if (!mesh.visible) return;
        profile(e, 0, Math.min(DIP, (top - BASE) * 0.7) * open, top);
        writeBlock(g, 0.002);
      };
      block(blockR.current, geo.blockR, rightN, 0);
      block(blockL.current, geo.blockL, leftN, 1);

      // closed: centre the book; open: centre the spine
      if (group.current) group.current.position.x = (-CW / 2) * (1 - open);
      if (contact.current) {
        contact.current.scale.set(CW * (1 + open) + 0.7, CH + 0.7, 1);
        contact.current.position.x = (CW / 2) * (1 - open);
      }
    }

    // hover easing + repaint of animated pages
    sides.forEach((page, s) => {
      const goal = hover.current.side === s ? 1 : 0;
      const prev = hoverAmt.current[s];
      const next = damp(prev, goal, 7, dt);
      hoverAmt.current[s] = Math.abs(next - goal) < 0.002 ? goal : next;
      const moving = hoverAmt.current[s] !== prev;
      if (dirty.current[s] || moving || (page.animated && hoverAmt.current[s] > 0)) {
        redraw(s, t);
        dirty.current[s] = false;
      }
    });
  });

  const pageCoords = (e, face) => {
    const u = face === 'front' ? e.uv.x : 1 - e.uv.x;
    return [u * PW, (1 - e.uv.y) * PH];
  };

  const handleMove = (leafIdx, face) => (e) => {
    e.stopPropagation();
    // touch has no hover; a lingering touch "hover" would repaint a page every frame
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const side = leafIdx * 2 + (face === 'front' ? 0 : 1);
    const [px, py] = pageCoords(e, face);
    const link = hitLink(side, px, py);
    if (hover.current.side !== side || hover.current.link !== link) {
      if (hover.current.side >= 0) dirty.current[hover.current.side] = true;
      hover.current = { side, link };
      dirty.current[side] = true;
    }
    document.body.style.cursor = 'pointer';
  };

  const handleOut = () => {
    if (hover.current.side >= 0) dirty.current[hover.current.side] = true;
    hover.current = { side: -1, link: -1 };
    document.body.style.cursor = '';
  };

  const handleClick = (leafIdx, face) => (e) => {
    e.stopPropagation();
    const side = leafIdx * 2 + (face === 'front' ? 0 : 1);
    const [px, py] = pageCoords(e, face);
    const link = hitLink(side, px, py);
    if (link >= 0) {
      const { href } = sides[side].links[link];
      window.open(href, href.startsWith('mailto:') ? '_self' : '_blank', 'noopener');
      return;
    }
    // on single-page (portrait) layouts a tap always reads forward
    if (tapNext || leaves.current[leafIdx].target === 0) onNext();
    else onPrev();
  };

  const events = (leafIdx, face) => ({
    onPointerMove: handleMove(leafIdx, face),
    onPointerOut: handleOut,
    onClick: handleClick(leafIdx, face),
  });

  const boardFace = (tex) => (
    <meshStandardMaterial
      map={tex}
      roughnessMap={mats.foil}
      metalnessMap={mats.foil}
      roughness={1}
      metalness={1}
      bumpMap={mats.leather}
      bumpScale={0.8}
    />
  );

  return (
    <group ref={group} position={[-CW / 2, 0, 0]}>
      {/* contact shadow */}
      <mesh ref={contact} rotation-x={-Math.PI / 2} position={[CW / 2, DESK + 0.002, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={mats.contact} transparent opacity={0.75} depthWrite={false} />
      </mesh>

      {/* back board, its inside carries the closing page */}
      <mesh position={[CW / 2, DESK + (CT - 0.002) / 2, 0]} material={mats.cloth} castShadow receiveShadow>
        <boxGeometry args={[CW, CT - 0.002, CH]} />
      </mesh>
      <mesh geometry={geo.board} position-y={BASE} receiveShadow {...events(LAST, 'front')}>
        {boardFace(textures[LAST * 2].tex)}
      </mesh>

      {/* spine */}
      <mesh ref={spine} position-x={-CT / 2} material={mats.cloth} castShadow receiveShadow>
        <boxGeometry args={[CT, 1, CH]} />
      </mesh>

      {/* page blocks */}
      <mesh ref={blockR} geometry={geo.blockR} material={mats.block} castShadow receiveShadow frustumCulled={false} />
      <mesh ref={blockL} geometry={geo.blockL} material={mats.block} castShadow receiveShadow frustumCulled={false} />

      {/* front cover */}
      <group ref={cover}>
        <mesh geometry={geo.board} position-y={CT} castShadow receiveShadow {...events(0, 'front')}>
          {boardFace(textures[0].tex)}
        </mesh>
        <mesh geometry={geo.board} receiveShadow {...events(0, 'back')}>
          <meshStandardMaterial
            map={textures[1].tex}
            side={THREE.BackSide}
            roughness={0.9}
            bumpMap={mats.paperBump}
            bumpScale={0.6}
          />
        </mesh>
        <mesh position={[CW / 2, CT / 2, 0]} material={mats.cloth} castShadow>
          <boxGeometry args={[CW - 0.002, CT - 0.004, CH - 0.002]} />
        </mesh>
      </group>

      {/* paper leaves */}
      {geo.leaves.map((g, k) => {
        const i = k + 1;
        return (
          <group key={i}>
            <mesh
              ref={(m) => (leafMeshes.current[k] = m)}
              geometry={g}
              receiveShadow
              frustumCulled={false}
              {...events(i, 'front')}
            >
              <meshStandardMaterial
                map={textures[i * 2].tex}
                roughness={0.9}
                bumpMap={mats.paperBump}
                bumpScale={0.6}
              />
            </mesh>
            <mesh geometry={g} receiveShadow frustumCulled={false} {...events(i, 'back')}>
              <meshStandardMaterial
                map={textures[i * 2 + 1].tex}
                side={THREE.BackSide}
                roughness={0.9}
                bumpMap={mats.paperBump}
                bumpScale={0.6}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ─── desk + props ─────────────────────────────────────────────────────
function useWoodTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 1024;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#16120f';
    ctx.fillRect(0, 0, 1024, 1024);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 520; i++) {
      const y = rnd() * 1024;
      const amp = 4 + rnd() * 14;
      const freq = 0.004 + rnd() * 0.01;
      const phase = rnd() * 10;
      ctx.strokeStyle = rnd() > 0.5 ? `rgba(70,56,44,${0.08 + rnd() * 0.18})` : `rgba(0,0,0,${0.2 + rnd() * 0.3})`;
      ctx.lineWidth = 0.6 + rnd() * 2.2;
      ctx.beginPath();
      for (let x = 0; x <= 1024; x += 16) {
        const yy = y + Math.sin(x * freq + phase) * amp;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.anisotropy = 8;
    return tex;
  }, []);
}

function Desk() {
  const wood = useWoodTexture();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial map={wood} roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

// A slab with rounded corners in plan view and softly bevelled edges,
// sitting on y = 0. Good for laptops, phones and cards.
function roundedSlab(w, d, h, r, bevel = 0.008) {
  const s = new THREE.Shape();
  const x = -w / 2 + bevel,
    y = -d / 2 + bevel;
  const ww = w - bevel * 2,
    dd = d - bevel * 2;
  const rr = Math.max(0.001, r - bevel);
  s.moveTo(x + rr, y);
  s.lineTo(x + ww - rr, y);
  s.quadraticCurveTo(x + ww, y, x + ww, y + rr);
  s.lineTo(x + ww, y + dd - rr);
  s.quadraticCurveTo(x + ww, y + dd, x + ww - rr, y + dd);
  s.lineTo(x + rr, y + dd);
  s.quadraticCurveTo(x, y + dd, x, y + dd - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.0005, h - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 10,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  return g;
}

function useCanvasTex(w, h, paint) {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    paint(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [w, h, paint]);
}

// ─── laptop ───────────────────────────────────────────────────────────
const LB = { w: 2.9, d: 2.0, h: 0.05 }; // base
const LID_OPEN = (112 * Math.PI) / 180;

function paintEditor(ctx, w, h) {
  ctx.fillStyle = '#16171a';
  ctx.fillRect(0, 0, w, h);
  // window chrome
  ctx.fillStyle = '#1f2024';
  ctx.fillRect(0, 0, w, 34);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(22 + i * 22, 17, 6.5, 0, Math.PI * 2);
    ctx.fill();
  });
  // sidebar
  ctx.fillStyle = '#1b1c20';
  ctx.fillRect(0, 34, 190, h - 34);
  ctx.font = '500 15px Menlo, monospace';
  [
    'models',
    '  mrp_production.py',
    '  stock_move.py',
    'views',
    '  production.xml',
    'security',
    '__manifest__.py',
  ].forEach((t, i) => {
    ctx.fillStyle = i === 1 ? '#e8e4dc' : '#7d7a74';
    ctx.fillText(t, 16, 70 + i * 26);
  });
  // code
  const palette = ['#c9c4ba', '#8f8b84', '#d6b98c', '#9fb89a', '#c9b49a', '#8fb3c9'];
  let seed = 9;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let line = 0; line < 22; line++) {
    const y = 70 + line * 25;
    ctx.fillStyle = '#4d4b47';
    ctx.font = '500 14px Menlo, monospace';
    ctx.fillText(String(line + 1).padStart(2, ' '), 206, y);
    let x = 248 + (line % 5 === 0 ? 0 : 28 * (1 + Math.floor(rnd() * 3)));
    const words = 2 + Math.floor(rnd() * 5);
    for (let k = 0; k < words && x < w - 60; k++) {
      const len = 30 + rnd() * 110;
      ctx.fillStyle = palette[Math.floor(rnd() * palette.length)];
      ctx.fillRect(x, y - 10, len, 11);
      x += len + 12;
    }
  }
  // status bar
  ctx.fillStyle = '#202125';
  ctx.fillRect(0, h - 26, w, 26);
}

function Laptop(props) {
  const screen = useCanvasTex(1024, 660, paintEditor);
  const geo = useMemo(() => {
    const keys = [];
    const pitch = 0.18;
    const rows = [
      { z: -0.86, d: 0.07, n: 14 },
      { z: -0.74, d: 0.13, n: 14 },
      { z: -0.58, d: 0.13, n: 14 },
      { z: -0.42, d: 0.13, n: 13 },
      { z: -0.26, d: 0.13, n: 12 },
    ];
    rows.forEach((r) => {
      const span = r.n * pitch;
      for (let i = 0; i < r.n; i++) keys.push([-span / 2 + pitch * (i + 0.5), r.z, 0.15, r.d]);
    });
    keys.push([0, -0.1, 0.95, 0.13]); // space bar
    [-0.92, -0.74, 0.74, 0.92].forEach((x) => keys.push([x, -0.1, 0.15, 0.13]));
    return {
      base: roundedSlab(LB.w, LB.d, LB.h, 0.11, 0.012),
      lid: roundedSlab(LB.w, LB.d - 0.05, 0.03, 0.11, 0.01),
      pad: roundedSlab(1.15, 0.7, 0.003, 0.05, 0.001),
      key: roundedSlab(1, 1, 0.012, 0.18, 0.003),
      keys,
    };
  }, []);
  const keysRef = useRef();
  useEffect(() => {
    const m = new THREE.Matrix4();
    geo.keys.forEach(([x, z, w, d], i) => {
      m.compose(new THREE.Vector3(x, LB.h, z), new THREE.Quaternion(), new THREE.Vector3(w, 1, d));
      keysRef.current.setMatrixAt(i, m);
    });
    keysRef.current.instanceMatrix.needsUpdate = true;
  }, [geo]);

  const alu = { color: '#8d8f93', metalness: 1, roughness: 0.38 };
  const lidD = LB.d - 0.05;
  return (
    <group {...props}>
      <mesh geometry={geo.base} castShadow receiveShadow>
        <meshStandardMaterial {...alu} />
      </mesh>
      <instancedMesh
        ref={keysRef}
        args={[geo.key, undefined, geo.keys.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <meshStandardMaterial color="#141416" roughness={0.55} />
      </instancedMesh>
      <mesh geometry={geo.pad} position={[0, LB.h, 0.5]} receiveShadow>
        <meshStandardMaterial color="#83858a" metalness={0.6} roughness={0.5} />
      </mesh>
      {/* lid, hinged at the back edge */}
      <group position={[0, LB.h, -LB.d / 2 + 0.03]} rotation-x={-LID_OPEN}>
        <mesh geometry={geo.lid} position={[0, 0, lidD / 2]} castShadow receiveShadow>
          <meshStandardMaterial {...alu} />
        </mesh>
        {/* glass bezel + panel, on the inner face */}
        <mesh position={[0, -0.001, lidD / 2]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[LB.w - 0.06, lidD - 0.06]} />
          <meshStandardMaterial color="#050506" roughness={0.25} metalness={0.2} />
        </mesh>
        <mesh position={[0, -0.002, lidD / 2 + 0.02]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[LB.w - 0.22, lidD - 0.26]} />
          <meshStandardMaterial
            color="#000"
            emissive="#ffffff"
            emissiveMap={screen}
            emissiveIntensity={0.85}
            roughness={0.32}
          />
        </mesh>
      </group>
      {/* faint spill from the screen */}
      <pointLight position={[0, 1.0, 0.1]} intensity={0.6} distance={5} decay={2} color="#cfd8e6" />
    </group>
  );
}

// ─── phone, face down ─────────────────────────────────────────────────
function Phone(props) {
  const geo = useMemo(
    () => ({
      body: roundedSlab(0.74, 1.52, 0.06, 0.12, 0.012),
      back: roundedSlab(0.72, 1.5, 0.002, 0.11, 0.0008),
      bump: roundedSlab(0.34, 0.34, 0.018, 0.07, 0.006),
    }),
    [],
  );
  const lenses = [
    [-0.075, -0.075],
    [0.075, -0.075],
    [-0.075, 0.075],
  ];
  return (
    <group {...props}>
      <mesh geometry={geo.body} castShadow receiveShadow>
        <meshStandardMaterial color="#3a3b3f" metalness={0.9} roughness={0.28} />
      </mesh>
      {/* frosted glass back */}
      <mesh geometry={geo.back} position-y={0.06} receiveShadow>
        <meshStandardMaterial color="#2c2d31" roughness={0.55} metalness={0.1} />
      </mesh>
      <group position={[-0.16, 0.062, -0.5]}>
        <mesh geometry={geo.bump} castShadow>
          <meshStandardMaterial color="#2f3034" roughness={0.12} metalness={0.3} />
        </mesh>
        {lenses.map(([x, z], i) => (
          <group key={i} position={[x, 0.018, z]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.058, 0.058, 0.02, 40]} />
              <meshStandardMaterial color="#9a9ca1" metalness={1} roughness={0.18} />
            </mesh>
            <mesh position-y={0.0105}>
              <cylinderGeometry args={[0.044, 0.044, 0.002, 40]} />
              <meshStandardMaterial color="#060608" roughness={0.02} metalness={0.5} />
            </mesh>
          </group>
        ))}
        <mesh position={[0.075, 0.019, 0.075]}>
          <cylinderGeometry args={[0.022, 0.022, 0.004, 24]} />
          <meshStandardMaterial color="#e9e1cf" emissive="#3b3326" roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

// ─── pen ──────────────────────────────────────────────────────────────
function Pen(props) {
  const geo = useMemo(() => {
    // profile from tip (y = 0) to end cap (y = 1.62), radius in x
    const tip = [
      [0, 0],
      [0.006, 0.004],
      [0.012, 0.03],
      [0.026, 0.12],
      [0.03, 0.135],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const body = [
      [0.03, 0.135],
      [0.034, 0.16],
      [0.036, 0.5],
      [0.0365, 1.2],
      [0.036, 1.5],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const cap = [
      [0.036, 1.5],
      [0.035, 1.56],
      [0.03, 1.6],
      [0.018, 1.618],
      [0, 1.62],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return {
      tip: new THREE.LatheGeometry(tip, 40),
      body: new THREE.LatheGeometry(body, 40),
      cap: new THREE.LatheGeometry(cap, 40),
      ring: new THREE.TorusGeometry(0.0368, 0.0035, 10, 40),
    };
  }, []);
  const chrome = { color: '#d4d5d8', metalness: 1, roughness: 0.16 };
  return (
    <group {...props}>
      {/* lie the pen down along +x, resting on its barrel */}
      <group rotation-z={-Math.PI / 2} position-y={0.037}>
        <mesh geometry={geo.tip} castShadow>
          <meshStandardMaterial {...chrome} />
        </mesh>
        <mesh geometry={geo.body} castShadow receiveShadow>
          <meshStandardMaterial color="#0f0f11" roughness={0.32} metalness={0.4} />
        </mesh>
        <mesh geometry={geo.cap} castShadow>
          <meshStandardMaterial {...chrome} />
        </mesh>
        <mesh geometry={geo.ring} position-y={1.2} rotation-x={Math.PI / 2}>
          <meshStandardMaterial {...chrome} />
        </mesh>
        {/* clip */}
        <mesh position={[-0.045, 1.33, 0]} castShadow>
          <boxGeometry args={[0.012, 0.42, 0.03]} />
          <meshStandardMaterial {...chrome} />
        </mesh>
      </group>
    </group>
  );
}

// ─── business cards ───────────────────────────────────────────────────
function paintCard(ctx, w, h) {
  ctx.fillStyle = '#f3f1ec';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#141416';
  ctx.beginPath();
  ctx.arc(70, h / 2, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f3f1ec';
  ctx.font = '700 32px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('B', 70, h / 2 + 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#141416';
  ctx.font = '600 34px Inter, Arial, sans-serif';
  ctx.fillText('baron betazara', 116, h / 2 + 4);
  ctx.fillStyle = '#7a7368';
  ctx.font = '500 17px Inter, Arial, sans-serif';
  ctx.fillText('ERP DEVELOPER', 118, h / 2 + 34);
}

function Cards(props) {
  const print = useCanvasTex(512, 292, paintCard);
  const slab = useMemo(() => roundedSlab(0.9, 0.52, 0.008, 0.025, 0.002), []);
  const stack = [
    [0.05, -0.02, 0.18],
    [-0.03, 0.03, -0.08],
    [0, 0, 0.04],
  ];
  return (
    <group {...props}>
      {stack.map(([x, z, r], i) => (
        <group key={i} position={[x, i * 0.0085, z]} rotation-y={r}>
          <mesh geometry={slab} castShadow receiveShadow>
            <meshStandardMaterial color="#efede8" roughness={0.85} />
          </mesh>
          {i === stack.length - 1 && (
            <mesh position-y={0.0085} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[0.88, 0.5]} />
              <meshStandardMaterial map={print} roughness={0.8} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function Props() {
  return (
    <group position={[0, DESK, 0]}>
      <Laptop position={[4.3, 0, 2.2]} rotation-y={-0.5} scale={0.72} />
      <Cards position={[4.6, 0, -1.95]} rotation-y={0.25} />
      <Phone position={[-4.65, 0, -1.75]} rotation-y={0.3} />
      <Pen position={[-5.0, 0, 1.75]} rotation-y={0.5} />
    </group>
  );
}

// ─── camera ───────────────────────────────────────────────────────────
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(32 / 2));

// Portrait screens are too narrow for a landscape spread, so the camera
// frames one page at a time (`focus`), looking more top-down for legibility.
function CameraRig({ flipped, focus, portrait }) {
  const { camera, size, pointer, scene } = useThree();
  const look = useMemo(() => new THREE.Vector3(0, 0, 0.2), []);
  useFrame((_, dt) => {
    const aspect = size.width / size.height;
    const open = flipped > 0;
    // half of the world width that must stay in view
    const span = portrait ? (open ? W / 2 + 0.08 : CW / 2 + 0.2) : open ? W + 0.35 : CW / 2 + 0.6;
    const base = portrait ? 0 : open ? 9.2 : 9.5;
    const dist = Math.max(base, span / (TAN_HALF_FOV * aspect));
    const lx = portrait && open ? (focus === 'right' ? W / 2 : -W / 2) : 0;
    const [ey, ez] = portrait ? [0.9, 0.44] : [0.76, 0.66];
    const k = portrait ? 0.4 : 1; // calmer parallax on touch screens
    look.x = damp(look.x, lx, 3, dt);
    camera.position.x = damp(camera.position.x, lx + pointer.x * 0.35 * k, 3, dt);
    camera.position.y = damp(camera.position.y, dist * ey + pointer.y * 0.2 * k, 2.5, dt);
    camera.position.z = damp(camera.position.z, dist * ez, 2.5, dt);
    camera.lookAt(look);
    // keep the fog fall-off relative to the camera so far views don't go black
    if (scene.fog) {
      const d = camera.position.distanceTo(look);
      scene.fog.near = d * 1.05;
      scene.fog.far = d * 2.1;
    }
  });
  return null;
}

const COARSE = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

export default function BookScene({ flipped, onNext, onPrev, focus, portrait }) {
  return (
    <Canvas
      shadows="soft"
      // phones are 3x; page text needs close to native resolution to stay crisp
      dpr={[1, COARSE ? 2.5 : 2]}
      camera={{ fov: 32, position: [0, 7, 5], near: 0.1, far: 100 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.shadowMap.autoUpdate = false; // Book requests updates while it moves
        scene.background = new THREE.Color('#070606');
        scene.fog = new THREE.Fog('#070606', 10, 20);
        // soft studio reflections for the foil, ceramics and paper sheen
        const pmrem = new THREE.PMREMGenerator(gl);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environmentIntensity = 0.22;
        pmrem.dispose();
      }}
      aria-label="Portfolio book"
    >
      <ambientLight intensity={0.06} />
      <hemisphereLight args={['#d8d0c4', '#0a0806', 0.14]} />
      <spotLight
        position={[0.6, 9, 2.6]}
        angle={0.6}
        penumbra={0.9}
        intensity={3.0}
        decay={0}
        color="#fff4e6"
        castShadow
        shadow-mapSize={COARSE ? [1024, 1024] : [2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
      />
      <Desk />
      <Props />
      <Book flipped={flipped} onNext={onNext} onPrev={onPrev} tapNext={portrait} />
      <CameraRig flipped={flipped} focus={focus} portrait={portrait} />
    </Canvas>
  );
}
