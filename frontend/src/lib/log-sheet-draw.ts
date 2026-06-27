import { STATUS_ROWS, STATUS_INDEX } from './constants';
import type { DailyLog, DutyStatus } from '../types/trip';

export const LOG_SHEET_WIDTH = 920;

const GRID_LEFT = 118;
const GRID_RIGHT = LOG_SHEET_WIDTH - 64;
const GRID_TOP = 34;
const ROW_H = 34;
const GRID_W = GRID_RIGHT - GRID_LEFT;
const HOUR_W = GRID_W / 24;
const CANVAS_HEIGHT = GRID_TOP + ROW_H * 4 + 26;

function hourLabel(h: number): string {
  if (h === 0 || h === 24) return 'M';
  if (h === 12) return 'N';
  return String(h % 12 === 0 ? 12 : h % 12);
}

function xForMinutes(min: number): number {
  return GRID_LEFT + (min / 1440) * GRID_W;
}

function rowCenter(statusKey: DutyStatus): number {
  return GRID_TOP + STATUS_INDEX[statusKey] * ROW_H + ROW_H / 2;
}

export function drawLogSheet(canvas: HTMLCanvasElement, log: DailyLog): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = LOG_SHEET_WIDTH * dpr;
  canvas.height = CANVAS_HEIGHT * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, LOG_SHEET_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, LOG_SHEET_WIDTH, CANVAS_HEIGHT);

  ctx.font = '11px Inter, sans-serif';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#475569';
  ctx.textAlign = 'center';
  for (let h = 0; h <= 24; h++) {
    ctx.fillText(hourLabel(h), xForMinutes(h * 60), GRID_TOP - 16);
  }

  for (let h = 0; h <= 24; h++) {
    const x = xForMinutes(h * 60);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, GRID_TOP);
    ctx.lineTo(x, GRID_TOP + ROW_H * 4);
    ctx.stroke();

    if (h < 24) {
      for (let q = 1; q < 4; q++) {
        const qx = x + (q / 4) * HOUR_W;
        ctx.strokeStyle = '#e2e8f0';
        for (let r = 0; r < 4; r++) {
          const top = GRID_TOP + r * ROW_H;
          const tickLen = q === 2 ? ROW_H * 0.32 : ROW_H * 0.18;
          ctx.beginPath();
          ctx.moveTo(qx, top);
          ctx.lineTo(qx, top + tickLen);
          ctx.moveTo(qx, top + ROW_H);
          ctx.lineTo(qx, top + ROW_H - tickLen);
          ctx.stroke();
        }
      }
    }
  }

  STATUS_ROWS.forEach((row, i) => {
    const top = GRID_TOP + i * ROW_H;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(GRID_LEFT, top);
    ctx.lineTo(GRID_RIGHT, top);
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.textAlign = 'left';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillText(row.label, 8, top + ROW_H / 2);

    const hours = log.totals[row.key] ?? 0;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(hours.toFixed(2), LOG_SHEET_WIDTH - 8, top + ROW_H / 2);
    ctx.font = '11px Inter, sans-serif';
  });

  ctx.strokeStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(GRID_LEFT, GRID_TOP + ROW_H * 4);
  ctx.lineTo(GRID_RIGHT, GRID_TOP + ROW_H * 4);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'right';
  ctx.font = '600 10px Inter, sans-serif';
  ctx.fillText('Hrs', LOG_SHEET_WIDTH - 8, GRID_TOP - 16);

  const entries = log.entries ?? [];
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  let prevY: number | null = null;
  entries.forEach((e) => {
    const y = rowCenter(e.status);
    const x0 = xForMinutes(e.start);
    const x1 = xForMinutes(e.end);
    if (prevY !== null && prevY !== y) {
      ctx.lineTo(x0, prevY);
      ctx.lineTo(x0, y);
    } else if (prevY === null) {
      ctx.moveTo(x0, y);
    }
    ctx.lineTo(x1, y);
    prevY = y;
  });
  ctx.stroke();
}
