
import { ScheduleBlock } from '../types';


export function getBlockIcon(kind: ScheduleBlock['kind']): string {
  switch (kind) {
    case 'nap':
      return '🛌';
    case 'bedtime':
      return '🌙';
    case 'windDown':
      return '✨';
    default:
      return '⏰';
  }
}


export function getTipIcon(type: 'warning' | 'suggestion' | 'info'): string {
  switch (type) {
    case 'warning':
      return '⚠️';
    case 'suggestion':
      return '💡';
    case 'info':
      return 'ℹ️';
    default:
      return '📌';
  }
}

