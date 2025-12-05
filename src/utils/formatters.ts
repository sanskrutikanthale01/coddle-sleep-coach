

import { time } from './time';
import { SleepSession } from '../types';


export function formatDurationFromSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}


export function formatDurationFromISO(startISO: string, endISO: string): string {
  const minutes = time.durationMinutes(startISO, endISO);
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hours}h ${minsStr}m`;
  }
  return `${mins}m`;
}


export function formatDurationFromMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hours}h ${minsStr}m`;
  }
  return `${mins}m`;
}


export function formatSessionTime(startISO: string, endISO: string): string {
  const start = time.parse(startISO);
  const end = time.parse(endISO);
  return `${start.format('h:mm A')} - ${end.format('h:mm A')}`;
}


export function formatDateHeader(dateKey: string): string {
  const date = time.parse(dateKey + 'T00:00:00');
  const today = time.dayKey(time.nowISO());
  const yesterday = time.dayKey(time.now().subtract(1, 'day').toISOString());

  if (dateKey === today) {
    return 'Today';
  } else if (dateKey === yesterday) {
    return 'Yesterday';
  } else {
    return date.format('MMMM D, YYYY');
  }
}


export function formatBlockTime(startISO: string, endISO: string): string {
  const start = time.parse(startISO);
  const end = time.parse(endISO);
  const minutes = time.durationMinutes(startISO, endISO);
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  let durationStr = '';
  if (hours > 0) {
    const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
    durationStr = `${hours}h ${minsStr}m`;
  } else {
    durationStr = `${minutes}m`;
  }

  return `${start.format('h:mm A')} - ${end.format('h:mm A')} (${durationStr})`;
}


export function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

