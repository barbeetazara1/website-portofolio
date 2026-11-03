// Canvas renderers for every side of every leaf in the 3D book.
// Each page is drawn onto a canvas that becomes a texture. A page can be
// redrawn every frame while it is hovered, which is what makes it "move".

import { profile, links, experiences, skills, education } from '../data';

export const PW = 1280; // page texture width  (px)
export const PH = 840; //  page texture height (px) — matches leaf aspect 3.2 : 2.1

const F = {
  serif: '"Playfair Display", Georgia, serif',
  sans: 'Inter, "Helvetica Neue", Arial, sans-serif',
  mono: '"Fira Code", Menlo, monospace',
};

const C = {
  paper: '#f1ece2',
  paperEdge: '#e2dacb',
  ink: '#1a1a1d',
  inkSoft: '#55524c',
  night: '#101012',
  nightSoft: '#1a1a1e',
  chalk: '#efece6',
  chalkSoft: '#9a978f',
  accent: '#7a7368',
  accentSoft: '#b8b2a7',
};

// ─── helpers ───────────────────────────────────────────────────────────
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);

function font(ctx, weight, size, fam = F.sans) {
  ctx.font = `${weight} ${size}px ${fam}`;
}

function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Background + gutter shadow. `gutter` is the edge that meets the spine.
function paper(ctx, gutter, dark) {
  ctx.fillStyle = dark ? C.night : C.paper;
  ctx.fillRect(0, 0, PW, PH);
  if (!gutter) return;
  const gx = gutter === 'left' ? 0 : PW;
  const g = ctx.createLinearGradient(gx, 0, gutter === 'left' ? 140 : PW - 140, 0);
  g.addColorStop(0, dark ? 'rgba(0,0,0,0.55)' : 'rgba(60,45,25,0.22)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PW, PH);
}

// Content box that keeps a wider margin on the spine side.
function box(gutter) {
  const inner = 130;
  const outer = 96;
  const left = gutter === 'left' ? inner : outer;
  const right = gutter === 'left' ? outer : inner;
  return { x: left, y: 92, w: PW - left - right, h: PH - 92 * 2 };
}

function eyebrow(ctx, text, x, y, color) {
  font(ctx, 600, 18, F.sans);
  ctx.fillStyle = color;
  ctx.letterSpacing = '4px';
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.letterSpacing = '0px';
}

function folio(ctx, n, gutter, dark) {
  font(ctx, 500, 18, F.mono);
  ctx.fillStyle = dark ? C.chalkSoft : C.inkSoft;
  ctx.textAlign = gutter === 'left' ? 'right' : 'left';
  ctx.fillText(String(n).padStart(2, '0'), gutter === 'left' ? PW - 96 : 96, PH - 48);
  ctx.textAlign = 'left';
}

function logoMark(ctx, cx, cy, r, color, bg) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  font(ctx, 700, r * 1.25, F.serif);
  ctx.fillStyle = bg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('B', cx, cy + r * 0.06);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function sheen(ctx, t, strength) {
  if (strength <= 0.001) return;
  const pos = ((t * 0.45) % 1.6) - 0.3;
  const x = pos * PW * 1.4;
  const g = ctx.createLinearGradient(x - 260, 0, x + 260, PH);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, `rgba(255,255,255,${0.09 * strength})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PW, PH);
}

// ─── page definitions ─────────────────────────────────────────────────
// draw(ctx, s) where s = { h: hover 0..1, t: seconds, link: hovered link index, assets }

const cover = {
  animated: true,
  draw(ctx, s) {
    const g = ctx.createRadialGradient(PW * 0.5, PH * 0.42, 40, PW * 0.5, PH * 0.5, PW * 0.75);
    g.addColorStop(0, '#26262b');
    g.addColorStop(1, '#0b0b0d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PW, PH);
    // faint leather grain
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = i % 2 ? '#fff' : '#000';
      ctx.fillRect((i * 337) % PW, (i * 211) % PH, 2, 2);
    }
    ctx.globalAlpha = 1;
    // spine band
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, 34, PH);

    drawBrand(ctx, C.chalk, '#121214');
    sheen(ctx, s.t, s.h);
  },
};

function drawBrand(ctx, color, bg) {
  logoMark(ctx, PW / 2 - 205, PH / 2 - 6, 34, color, bg);
  font(ctx, 600, 56, F.sans);
  ctx.fillStyle = color;
  ctx.fillText('baron betazara', PW / 2 - 155, PH / 2 + 14);
}

// Roughness (green) + metalness (blue) map for the cover: the brand mark is
// stamped in glossy silver foil, the rest is matte bookcloth.
export function drawFoilMap(ctx) {
  ctx.fillStyle = 'rgb(0,165,0)';
  ctx.fillRect(0, 0, PW, PH);
  drawBrand(ctx, 'rgb(0,55,255)', 'rgb(0,165,0)');
}

const photoPage = {
  animated: true,
  draw(ctx, s) {
    paper(ctx, 'right', true);
    const img = s.assets.photo;
    const px = 96, py = 92, pw = 470, ph = PH - 184;
    ctx.save();
    rr(ctx, px, py, pw, ph, 18);
    ctx.clip();
    ctx.fillStyle = C.nightSoft;
    ctx.fillRect(px, py, pw, ph);
    if (img) {
      // crop in around the subject (focus point as a fraction of the photo)
      const fx = 0.5, fy = 0.58;
      const zoom = 1.75 + 0.08 * easeOut(s.h);
      const scale = Math.max(pw / img.width, ph / img.height) * zoom;
      const iw = img.width * scale;
      const ih = img.height * scale;
      const ix = Math.min(px, Math.max(px + pw - iw, px + pw / 2 - fx * iw));
      const iy = Math.min(py, Math.max(py + ph - ih, py + ph / 2 - fy * ih));
      ctx.drawImage(img, ix, iy, iw, ih);
    }
    const shade = ctx.createLinearGradient(0, py + ph * 0.55, 0, py + ph);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = shade;
    ctx.fillRect(px, py, pw, ph);
    ctx.restore();
    font(ctx, 500, 20, F.mono);
    ctx.fillStyle = C.chalk;
    ctx.fillText(profile.location, px + 28, py + ph - 30);

    const x = 640;
    eyebrow(ctx, 'Portfolio', x, 140, C.accentSoft);
    font(ctx, 400, 44, F.serif);
    ctx.fillStyle = C.chalk;
    ctx.fillText('Building ERP systems', x, 220);
    ctx.fillText('that run real factories.', x, 274);

    profile.stats.forEach((st, i) => {
      const y = 420 + i * 120;
      const e = easeOut(s.h * 1.8 - i * 0.25);
      font(ctx, 600, 74, F.serif);
      ctx.fillStyle = C.chalk;
      ctx.fillText(st.value, x, y + 26);
      font(ctx, 500, 22, F.sans);
      ctx.fillStyle = C.chalkSoft;
      ctx.fillText(st.label, x + 150, y + 16);
      ctx.fillStyle = C.chalk;
      ctx.fillRect(x + 150, y + 30, 260 * e, 3);
    });
    folio(ctx, 1, 'right', true);
  },
};

const aboutPage = {
  animated: true,
  draw(ctx, s) {
    paper(ctx, 'left', false);
    const b = box('left');
    // eyebrow cycles through roles with a typing effect while hovered
    let role = profile.roles[0];
    if (s.h > 0.05) {
      const per = 1.8;
      const idx = Math.floor(s.t / per) % profile.roles.length;
      const local = (s.t % per) / per;
      const full = profile.roles[idx];
      const n = local < 0.6 ? Math.ceil(full.length * (local / 0.6)) : full.length;
      role = full.slice(0, n) + (Math.floor(s.t * 3) % 2 ? '|' : ' ');
    }
    eyebrow(ctx, role, b.x, b.y + 30, C.accent);

    font(ctx, 600, 78, F.serif);
    ctx.fillStyle = C.ink;
    ctx.fillText('Bonifasius Baron', b.x, b.y + 140);
    ctx.fillText('Betazara', b.x, b.y + 230);
    ctx.fillStyle = C.ink;
    ctx.fillRect(b.x, b.y + 262, 90 + 260 * easeOut(s.h), 5);

    font(ctx, 400, 27, F.sans);
    ctx.fillStyle = C.inkSoft;
    wrap(ctx, profile.summary, b.w - 40).forEach((l, i) => ctx.fillText(l, b.x, b.y + 340 + i * 42));

    folio(ctx, 2, 'left', false);
  },
};

function experiencePage(exp, i, gutter) {
  const dark = i % 2 === 1;
  return {
    animated: true,
    draw(ctx, s) {
      paper(ctx, gutter, dark);
      const b = box(gutter);
      const ink = dark ? C.chalk : C.ink;
      const soft = dark ? C.chalkSoft : C.inkSoft;
      const acc = dark ? C.accentSoft : C.accent;

      // oversized index number drifts in on hover
      font(ctx, 600, 330, F.serif);
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(20,20,30,0.05)';
      ctx.textAlign = 'right';
      ctx.fillText(String(i + 1).padStart(2, '0'), b.x + b.w + 20 - 30 * (1 - easeOut(s.h)), b.y + 290);
      ctx.textAlign = 'left';

      eyebrow(ctx, `Experience · ${String(i + 1).padStart(2, '0')} / ${String(experiences.length).padStart(2, '0')}`, b.x, b.y + 30, acc);
      font(ctx, 500, 20, F.mono);
      ctx.fillStyle = soft;
      ctx.fillText(exp.period, b.x, b.y + 74);
      if (exp.current) {
        const w = 118;
        const x = b.x + ctx.measureText(exp.period).width + 22;
        rr(ctx, x, b.y + 50, w, 34, 17);
        ctx.fillStyle = acc;
        ctx.fill();
        font(ctx, 600, 15, F.sans);
        ctx.fillStyle = dark ? C.night : '#fff';
        ctx.letterSpacing = '3px';
        ctx.fillText('CURRENT', x + 19, b.y + 73);
        ctx.letterSpacing = '0px';
      }

      font(ctx, 600, 60, F.serif);
      ctx.fillStyle = ink;
      ctx.fillText(exp.title, b.x, b.y + 160);
      font(ctx, 500, 27, F.sans);
      ctx.fillStyle = acc;
      ctx.fillText(exp.company, b.x, b.y + 208);
      font(ctx, 400, 21, F.sans);
      ctx.fillStyle = soft;
      ctx.fillText(exp.location, b.x, b.y + 242);

      // bullets: a highlight walks through them while hovered
      font(ctx, 400, 24, F.sans);
      const active = Math.floor(s.t * 0.9) % exp.items.length;
      let y = b.y + 312;
      exp.items.forEach((item, k) => {
        const lines = wrap(ctx, item, b.w - 56);
        const blockH = lines.length * 34;
        if (k === active && s.h > 0.01) {
          rr(ctx, b.x - 14, y - 28, b.w + 10, blockH + 16, 10);
          ctx.fillStyle = dark ? `rgba(255,255,255,${0.08 * s.h})` : `rgba(40,32,20,${0.07 * s.h})`;
          ctx.fill();
        }
        ctx.fillStyle = acc;
        ctx.fillRect(b.x, y - 12, k === active ? 10 + 14 * s.h : 10, 3);
        ctx.fillStyle = ink;
        const shift = k === active ? 6 * s.h : 0;
        lines.forEach((l, j) => ctx.fillText(l, b.x + 40 + shift, y + j * 34));
        y += blockH + 20;
      });
      folio(ctx, i + 3, gutter, dark);
    },
  };
}

const skillsPage = {
  animated: true,
  draw(ctx, s) {
    paper(ctx, 'right', false);
    const b = box('right');
    eyebrow(ctx, 'Technical Expertise', b.x, b.y + 30, C.accent);
    font(ctx, 600, 64, F.serif);
    ctx.fillStyle = C.ink;
    ctx.fillText('Skills & Tools', b.x, b.y + 118);

    const cols = 3;
    const gap = 22;
    const cw = (b.w - gap * (cols - 1)) / cols;
    const ch = 178;
    skills.forEach((cat, i) => {
      const cx = b.x + (i % cols) * (cw + gap);
      const cy = b.y + 172 + Math.floor(i / cols) * (ch + gap);
      rr(ctx, cx, cy, cw, ch, 16);
      ctx.fillStyle = '#fbf8f2';
      ctx.fill();
      ctx.strokeStyle = C.paperEdge;
      ctx.lineWidth = 2;
      ctx.stroke();
      font(ctx, 600, 16, F.sans);
      ctx.fillStyle = C.inkSoft;
      ctx.letterSpacing = '2px';
      ctx.fillText(cat.title.toUpperCase(), cx + 22, cy + 40);
      ctx.letterSpacing = '0px';
      let x = cx + 22;
      cat.skills.forEach((sk, k) => {
        font(ctx, 500, 22, F.sans);
        const w = ctx.measureText(sk).width + 34;
        const bob = Math.sin(s.t * 3.2 + i * 1.3 + k) * 5 * s.h;
        rr(ctx, x, cy + 80 + bob, w, 44, 22);
        ctx.fillStyle = k === 0 ? C.ink : '#ece6da';
        ctx.fill();
        ctx.fillStyle = k === 0 ? C.chalk : C.ink;
        ctx.fillText(sk, x + 17, cy + 109 + bob);
        x += w + 10;
      });
    });
    folio(ctx, 7, 'right', false);
  },
};

const educationPage = {
  animated: true,
  draw(ctx, s) {
    paper(ctx, 'left', true);
    const b = box('left');
    eyebrow(ctx, 'Academic Background', b.x, b.y + 30, C.accentSoft);
    font(ctx, 600, 64, F.serif);
    ctx.fillStyle = C.chalk;
    ctx.fillText('Education', b.x, b.y + 118);

    const gap = 26;
    const cw = (b.w - gap) / 2;
    education.forEach((edu, i) => {
      const cx = b.x + i * (cw + gap);
      const cy = b.y + 170;
      const chh = b.h - 190;
      rr(ctx, cx, cy, cw, chh, 18);
      ctx.fillStyle = C.nightSoft;
      ctx.fill();
      font(ctx, 500, 18, F.mono);
      ctx.fillStyle = C.chalkSoft;
      ctx.fillText(edu.period, cx + 28, cy + 46);
      font(ctx, 600, 32, F.serif);
      ctx.fillStyle = C.chalk;
      wrap(ctx, edu.school, cw - 56).forEach((l, j) => ctx.fillText(l, cx + 28, cy + 98 + j * 40));
      font(ctx, 500, 21, F.sans);
      ctx.fillStyle = C.accentSoft;
      ctx.fillText(edu.degree, cx + 28, cy + 152);
      font(ctx, 400, 18, F.sans);
      ctx.fillStyle = C.chalkSoft;
      ctx.fillText(edu.location, cx + 28, cy + 182);
      font(ctx, 'italic 400', 19, F.sans);
      ctx.fillStyle = '#c9c6bf';
      wrap(ctx, `Thesis: ${edu.thesis}`, cw - 56).forEach((l, j) => ctx.fillText(l, cx + 28, cy + 232 + j * 28));

      // GPA bar fills up while hovered
      const [got, max] = edu.gpa.split('/').map((v) => parseFloat(v));
      const ratio = got / max;
      const fill = s.h > 0.01 ? ratio * easeOut(((s.t * 0.6) % 1.4) / 0.9) : ratio;
      const by = cy + chh - 54;
      font(ctx, 600, 18, F.sans);
      ctx.fillStyle = C.chalk;
      ctx.fillText(`GPA ${edu.gpa}`, cx + 28, by - 16);
      rr(ctx, cx + 28, by, cw - 56, 8, 4);
      ctx.fillStyle = '#2a2a30';
      ctx.fill();
      rr(ctx, cx + 28, by, Math.max(8, (cw - 56) * fill), 8, 4);
      ctx.fillStyle = C.chalk;
      ctx.fill();
    });
    folio(ctx, 8, 'left', true);
  },
};

// Contact rows are clickable regions on the texture.
const contactRows = links.map((l, i) => ({ x: 96, y: 404 + i * 116, w: PW - 96 - 130, h: 96, href: l.href }));

const contactPage = {
  animated: true,
  links: contactRows,
  draw(ctx, s) {
    paper(ctx, 'right', false);
    const b = box('right');
    eyebrow(ctx, 'Get in touch', b.x, b.y + 30, C.accent);
    font(ctx, 600, 66, F.serif);
    ctx.fillStyle = C.ink;
    ctx.fillText("Let's build something", b.x, b.y + 124);
    ctx.fillText('together.', b.x, b.y + 204);

    contactRows.forEach((r, i) => {
      const hot = s.link === i;
      rr(ctx, r.x, r.y, r.w, r.h, 16);
      ctx.fillStyle = hot ? C.ink : '#fbf8f2';
      ctx.fill();
      if (!hot) {
        ctx.strokeStyle = C.paperEdge;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      font(ctx, 600, 16, F.sans);
      ctx.fillStyle = hot ? C.accentSoft : C.inkSoft;
      ctx.letterSpacing = '3px';
      ctx.fillText(links[i].label.toUpperCase(), r.x + 30, r.y + 38);
      ctx.letterSpacing = '0px';
      font(ctx, 500, 28, F.sans);
      ctx.fillStyle = hot ? C.chalk : C.ink;
      ctx.fillText(links[i].value, r.x + 30, r.y + 74);
      font(ctx, 500, 34, F.sans);
      ctx.textAlign = 'right';
      ctx.fillText('↗', r.x + r.w - 30 + (hot ? 6 : 0), r.y + 62 - (hot ? 6 : 0));
      ctx.textAlign = 'left';
    });
    folio(ctx, 9, 'right', false);
  },
};

// The last page closes the book with the same brand mark as the cover.
const endPage = { animated: true, draw: cover.draw };

const backCover = {
  animated: false,
  draw(ctx) {
    ctx.fillStyle = '#0d0d0f';
    ctx.fillRect(0, 0, PW, PH);
    logoMark(ctx, PW / 2, PH / 2, 30, '#3a3a40', '#0d0d0f');
  },
};

// Order matters: leaf i shows sides[2i] on its front and sides[2i + 1] on its back.
// After k flips the open spread is sides[2k - 1] (left) and sides[2k] (right).
export const sides = [
  cover,
  photoPage,
  aboutPage,
  experiencePage(experiences[0], 0, 'right'),
  experiencePage(experiences[1], 1, 'left'),
  experiencePage(experiences[2], 2, 'right'),
  experiencePage(experiences[3], 3, 'left'),
  skillsPage,
  educationPage,
  contactPage,
  endPage,
  backCover,
];

export const LEAF_COUNT = sides.length / 2;
export const MAX_FLIP = LEAF_COUNT - 1; // the back cover never needs turning

export const spreadLabels = ['Cover', 'About', 'Experience', 'Experience', 'Skills & Education', 'Contact'];

export function hitLink(side, px, py) {
  const list = sides[side].links;
  if (!list) return -1;
  return list.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
}
