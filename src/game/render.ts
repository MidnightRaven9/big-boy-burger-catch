import { COLORS, LOGICAL_H, LOGICAL_W } from './config';
import type { GameImages, GameState } from './types';

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

  // The mascot artwork itself contains the original white plate; no substitute plate is drawn.
  const blinking = state.invuln > 0 && Math.floor(state.invuln * 14) % 2 === 0;
  ctx.save();
  ctx.globalAlpha = blinking ? 0.42 : 1;
  ctx.drawImage(images.mascot, state.playerX - state.playerW / 2, state.playerY, state.playerW, state.playerH);
  ctx.restore();

  if (state.catchPulse > 0) {
    ctx.save();
    ctx.globalAlpha = state.catchPulse;
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (1 + (1 - state.catchPulse) * 1.25), 0, Math.PI * 2);
    ctx.stroke();
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

  if (state.flash > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(200, 16, 46, ${state.flash * 0.3})`;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    ctx.restore();
  }

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
