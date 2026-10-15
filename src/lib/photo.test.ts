import { describe, expect, it } from 'vitest';
import { photoCaption, photoFileName } from '@/lib/photo';

describe('photoFileName', () => {
  it('names the picture after the farm day and the moment it was taken', () => {
    expect(photoFileName(12, new Date(2026, 9, 5, 9, 7, 3))).toBe('sunny-farm-ngay-12-20261005-090703.png');
  });
});

describe('photoCaption', () => {
  it('stamps the zone, the farm day and its season', () => {
    expect(photoCaption('beach', 9)).toBe('🌻 Sunny Farm 3D • Bãi Biển Nhiệt Đới • Ngày 9, Mùa Hạ');
  });
});
