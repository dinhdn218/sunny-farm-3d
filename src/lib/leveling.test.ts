import { describe, expect, it } from 'vitest';
import { createInitialQuests } from '@/lib/quests';
import { estimateXp, levelInfo, levelReward, levelTitle, xpFor } from '@/lib/leveling';

describe('xpFor', () => {
  it('rewards farm work per action', () => {
    expect(xpFor('till', 1)).toBe(1);
    expect(xpFor('harvest', 2)).toBe(6);
  });

  it('gives 1 XP per 25 gold earned', () => {
    expect(xpFor('earn_gold', 100)).toBe(4);
    expect(xpFor('earn_gold', 24)).toBe(0);
  });

  it('gives nothing for chatting, so spamming chat cannot level anyone up', () => {
    expect(xpFor('chat', 5)).toBe(0);
  });
});

describe('levelInfo', () => {
  it('starts at level 1 needing 100 XP', () => {
    expect(levelInfo(0)).toEqual({ level: 1, into: 0, need: 100 });
    expect(levelInfo(99)).toEqual({ level: 1, into: 99, need: 100 });
  });

  it('needs 50 more XP for each following level', () => {
    expect(levelInfo(100)).toEqual({ level: 2, into: 0, need: 150 });
    expect(levelInfo(250)).toEqual({ level: 3, into: 0, need: 200 });
  });

  it('stops at the top level', () => {
    expect(levelInfo(10_000_000)).toMatchObject({ level: 50, need: 0 });
  });
});

describe('levelTitle', () => {
  it('changes title at the level bands', () => {
    expect(levelTitle(4)).toBe('Nông Dân Tập Sự');
    expect(levelTitle(5)).toBe('Nông Dân Chăm Chỉ');
    expect(levelTitle(10)).toBe('Chủ Trang Trại');
    expect(levelTitle(20)).toBe('Đại Điền Chủ');
    expect(levelTitle(35)).toBe('Huyền Thoại Nông Trại');
  });
});

describe('levelReward', () => {
  it('pays 50 gold per level, with extra gems every fifth level', () => {
    expect(levelReward(4)).toEqual({ gold: 200, gems: 2 });
    expect(levelReward(5)).toEqual({ gold: 250, gems: 10 });
  });
});

describe('estimateXp', () => {
  it('credits an older save for what its achievement counters show was done', () => {
    // 10 harvests × 3 XP + 4 nights × 5 XP
    expect(estimateXp(createInitialQuests(1, { a_harvest: 10, a_days: 4 }))).toBe(50);
  });
});
