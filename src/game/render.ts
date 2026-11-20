import { mascotPoseFor } from './animation';
import {
  COLORS,
  LOGICAL_H,
  LOGICAL_W,
  SPEED_UP_SECONDS,
} from './config';
import { MASCOT_LAYER_RECTS, MASCOT_PIVOTS } from './mascotLayers.generated';
import type {
  GameImages,
  GameState,
  MascotExpression,
  MascotLayerName,
} from './types';

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  images: GameImages,
): void {
  ctx.save();
  ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

  if (state.shake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * state.shake,
      (Math.random() - 0.5) * state.shake,
    );
  }

  drawBackdrop(ctx, state.elapsed);

  for (const fall of state.falls) {
    const img = fall.kind === 'burger' ? images.burger : images.gravy;
    const h = fall.radius * 1.9;
    const w = h * (img.naturalWidth / img.naturalHeight || 1);
    ctx.save();
    ctx.translate(fall.x, fall.y);
    ctx.rotate(fall.rotation);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  const p = state.plate;
  const glowRadius = p.radius * (1.45 + state.catchPulse * 0.9);
  const glow = ctx.createRadialGradient(p.x, p.y, p.radius * 0.2, p.x, p.y, glowRadius);
  glow.addColorStop(0, `rgba(255, 231, 150, ${0.26 + state.catchPulse * 0.45})`);
  glow.addColorStop(1, 'rgba(255, 231, 150, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  drawArticulatedMascot(ctx, state, images);

  if (state.catchPulse > 0) {
    const progress = 1 - state.catchPulse;
    ctx.save();
    ctx.globalAlpha = state.catchPulse;
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (1 + progress * 1.25), 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2 + progress * 0.8;
      const radius = p.radius * (1.15 + progress * 0.8);
      drawSparkle(
        ctx,
        p.x + Math.cos(angle) * radius,
        p.y + Math.sin(angle) * radius * 0.55,
        5 + state.catchPulse * 6,
      );
    }
    ctx.restore();
  }

  if (state.hitPulse > 0) {
    ctx.save();
    ctx.globalAlpha = state.hitPulse * 0.5;
    const ring = ctx.createRadialGradient(
      state.playerX,
      state.playerY + state.playerH * 0.5,
      10,
      state.playerX,
      state.playerY + state.playerH * 0.5,
      state.playerW * 0.9,
    );
    ring.addColorStop(0, 'rgba(200, 16, 46, 0)');
    ring.addColorStop(0.6, 'rgba(200, 16, 46, 0.75)');
    ring.addColorStop(1, 'rgba(200, 16, 46, 0)');
    ctx.fillStyle = ring;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.restore();
  }

  for (const particle of state.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 50px "Trebuchet MS", "Arial Rounded MT Bold", sans-serif';
  ctx.lineWidth = 9;
  ctx.strokeStyle = COLORS.brown;
  for (const text of state.texts) {
    ctx.globalAlpha = Math.max(0, text.life / text.maxLife);
    ctx.strokeText(text.text, text.x, text.y);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.restore();

  if (state.speedUpTimer > 0) drawSpeedUpBanner(ctx, state.speedUpTimer);

  if (state.flash > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(200, 16, 46, ${state.flash * 0.3})`;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draw the original mascot as independently transformed layers. At rest these
 * crops reassemble the source art exactly; while walking, the two legs swing
 * around their own hips, the free arm counters, the head tilts gently, and the
 * rigid plate arm never rotates, so the white plate stays level.
 */
function drawArticulatedMascot(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  images: GameImages,
): void {
  const pose = mascotPoseFor(state);
  const w = state.playerW;
  const h = state.playerH;
  const damageFlicker = state.invuln > 0 && Math.floor(state.invuln * 14) % 2 === 0;

  ctx.save();
  ctx.translate(state.playerX, state.playerY);
  if (state.facing === 'left') ctx.scale(-1, 1);
  ctx.translate(-w / 2 + pose.bodyX, pose.bodyY);
  ctx.globalAlpha = damageFlicker ? 0.42 : 1;

  drawLayer(ctx, images.layers['leg-back'], 'leg-back', w, h, pose.legBackAngle);
  drawLayer(ctx, images.layers['leg-front'], 'leg-front', w, h, pose.legFrontAngle);
  drawLayer(ctx, images.layers.torso, 'torso', w, h, 0);
  drawLayer(ctx, images.layers['arm-left'], 'arm-left', w, h, pose.armLeftAngle);
  // No angle is passed here: the original plate and its arm remain level.
  drawLayer(ctx, images.layers['plate-arm'], 'plate-arm', w, h, 0);
  drawExpressionHead(ctx, images, state.expression, w, h, pose.headAngle, pose.headY);

  ctx.restore();
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  name: MascotLayerName,
  w: number,
  h: number,
  angle: number,
  extraY = 0,
): void {
  const rect = MASCOT_LAYER_RECTS[name];
  const x = rect[0] * w;
  const y = rect[1] * h + extraY;
  const width = (rect[2] - rect[0]) * w;
  const height = (rect[3] - rect[1]) * h;
  if (!angle) {
    ctx.drawImage(image, x, y, width, height);
    return;
  }
  const pivots: Partial<Record<MascotLayerName, readonly [number, number]>> = MASCOT_PIVOTS;
  const pivot = pivots[name];
  if (!pivot) {
    ctx.drawImage(image, x, y, width, height);
    return;
  }
  const px = pivot[0] * w;
  const py = pivot[1] * h + extraY;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  ctx.translate(-px, -py);
  ctx.drawImage(image, x, y, width, height);
  ctx.restore();
}

function drawExpressionHead(
  ctx: CanvasRenderingContext2D,
  images: GameImages,
  expression: MascotExpression,
  w: number,
  h: number,
  angle: number,
  extraY: number,
): void {
  const image = images.expressions[expression] ?? images.expressions.normal;
  drawLayer(ctx, image, 'head', w, h, angle, extraY);
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = COLORS.white;
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.quadraticCurveTo(radius * 0.18, -radius * 0.18, radius, 0);
  ctx.quadraticCurveTo(radius * 0.18, radius * 0.18, 0, radius);
  ctx.quadraticCurveTo(-radius * 0.18, radius * 0.18, -radius, 0);
  ctx.quadraticCurveTo(-radius * 0.18, -radius * 0.18, 0, -radius);
  ctx.fill();
  ctx.restore();
}

function drawSpeedUpBanner(ctx: CanvasRenderingContext2D, timer: number): void {
  const progress = 1 - Math.max(0, Math.min(1, timer / SPEED_UP_SECONDS));
  const pop = Math.sin(Math.min(1, progress * 2.2) * Math.PI);
  const alpha = Math.min(1, timer * 2.6, progress * 10);
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(LOGICAL_W / 2, 196);
  ctx.scale(0.9 + pop * 0.18, 0.9 + pop * 0.18);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 56px "Trebuchet MS", "Arial Rounded MT Bold", sans-serif';
  ctx.lineWidth = 11;
  ctx.strokeStyle = COLORS.brown;
  ctx.strokeText('SPEED UP!', 0, 0);
  ctx.fillStyle = COLORS.yellow;
  ctx.fillText('SPEED UP!', 0, 0);
  ctx.restore();
}

function drawBackdrop(ctx: CanvasRenderingContext2D, elapsed: number): void {
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // Warm diner sunburst.
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = COLORS.yellow;
  const cx = LOGICAL_W / 2;
  const cy = 180;
  const rays = 16;
  for (let i = 0; i < rays; i += 1) {
    const spin = elapsed * 0.035;
    const a0 = (i / rays) * Math.PI * 2 + spin;
    const a1 = a0 + Math.PI / rays;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * 1500, cy + Math.sin(a0) * 1500);
    ctx.lineTo(cx + Math.cos(a1) * 1500, cy + Math.sin(a1) * 1500);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Classic red banner behind the top HUD.
  const banner = ctx.createLinearGradient(0, 0, 0, 150);
  banner.addColorStop(0, '#D8193A');
  banner.addColorStop(1, COLORS.redDark);
  ctx.fillStyle = banner;
  ctx.fillRect(0, 0, LOGICAL_W, 132);
  ctx.fillStyle = COLORS.yellow;
  ctx.fillRect(0, 126, LOGICAL_W, 6);

  // Checkerboard tablecloth.
  const tableTop = LOGICAL_H - 112;
  const cell = 56;
  ctx.save();
  ctx.globalAlpha = 0.9;
  for (let row = 0; row < Math.ceil((LOGICAL_H - tableTop) / cell) + 1; row += 1) {
    for (let col = 0; col < Math.ceil(LOGICAL_W / cell) + 1; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? COLORS.red : COLORS.creamDark;
      ctx.fillRect(col * cell, tableTop + row * cell, cell, cell);
    }
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = COLORS.brown;
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 14]);
  ctx.beginPath();
  ctx.moveTo(0, tableTop - 6);
  ctx.lineTo(LOGICAL_W, tableTop - 6);
  ctx.stroke();
  ctx.restore();
}
