/**
 * Time formatting utilities
 */

export interface TimeHMS {
  h: number;
  m: number;
  s: number;
}

export const toSeconds = (time: TimeHMS): number =>
  time.h * 3600 + time.m * 60 + time.s;

export const toHMS = (seconds: number): TimeHMS => {
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { h, m, s };
};

export const formatTime = (seconds: number): string => {
  const { h, m, s } = toHMS(seconds);
  return `${h > 0 ? h + "h " : ""}${m}m ${s}s`;
};
