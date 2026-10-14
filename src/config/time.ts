import { TimePhase } from '@/types/game';

export const TIME_PHASES: TimePhase[] = [
  {
    id: 'morning',
    label: '08:00 Sáng',
    sky: '#7dd3fc',
    fog: '#bae6fd',
    sunColor: '#fffbeb',
    sunIntensity: 1.15,
    ambientIntensity: 0.68,
  },
  {
    id: 'noon',
    label: '12:30 Trưa',
    sky: '#38bdf8',
    fog: '#93c5fd',
    sunColor: '#ffffff',
    sunIntensity: 1.3,
    ambientIntensity: 0.78,
  },
  {
    id: 'sunset',
    label: '17:45 Hoàng Hôn',
    sky: '#f97316',
    fog: '#fdba74',
    sunColor: '#fb923c',
    sunIntensity: 0.95,
    ambientIntensity: 0.52,
  },
  {
    id: 'night',
    label: '21:00 Đêm',
    sky: '#0f172a',
    fog: '#1e293b',
    sunColor: '#64748b',
    sunIntensity: 0.38,
    ambientIntensity: 0.35,
  },
];
