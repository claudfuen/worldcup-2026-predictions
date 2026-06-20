import { describe, it, expect } from "vitest";
import { expectedScore, updateElo, movMultiplier } from "../lib/sim/elo";
import { eloToLambdas, wdlProbs, sampleScoreline, scorelineDist } from "../lib/sim/poisson";
import { mulberry32 } from "../lib/sim/rng";

describe("Elo", () => {
  it("expectedScore is 0.5 at parity and monotone in rating gap", () => {
    expect(expectedScore(0)).toBeCloseTo(0.5, 6);
    expect(expectedScore(400)).toBeCloseTo(0.909, 2);
    expect(expectedScore(200)).toBeGreaterThan(expectedScore(0));
    expect(expectedScore(-200)).toBeLessThan(0.5);
  });
  it("winner gains rating, loser loses the same amount (zero-sum)", () => {
    const [h, a] = updateElo(1500, 1500, 2, 0, { neutral: true, weight: 1 });
    expect(h).toBeGreaterThan(1500);
    expect(a).toBeLessThan(1500);
    expect(h - 1500).toBeCloseTo(1500 - a, 6);
  });
  it("a bigger win moves ratings more", () => {
    expect(movMultiplier(4, 0)).toBeGreaterThan(movMultiplier(1, 0));
  });
  it("amplifies upsets: an underdog win moves ratings more than the same-margin favorite win (signed MOV)", () => {
    // movMultiplier's second arg is the SIGNED winner-minus-loser gap: negative (upset) amplifies.
    expect(movMultiplier(2, -400)).toBeGreaterThan(movMultiplier(2, 400));
    // end to end: a 1500 side beating a 1900 side 2-0 gains more than a 1900 side beating a 1500 side 2-0.
    const [upWin] = updateElo(1500, 1900, 2, 0, { neutral: true, weight: 1 });
    const [favWin] = updateElo(1900, 1500, 2, 0, { neutral: true, weight: 1 });
    expect(upWin - 1500).toBeGreaterThan(favWin - 1900);
  });
  it("MOV multiplier denominator never blows up or flips sign at extreme gaps", () => {
    expect(movMultiplier(3, -5000)).toBeGreaterThan(0);
    expect(Number.isFinite(movMultiplier(3, -5000))).toBe(true);
  });
});

describe("Poisson scoreline model", () => {
  it("expected goals are positive and favor the stronger side", () => {
    const [lh, la] = eloToLambdas(200);
    expect(lh).toBeGreaterThan(0);
    expect(la).toBeGreaterThan(0);
    expect(lh).toBeGreaterThan(la);
  });
  it("W/D/L probabilities sum to 1 and favor the stronger side", () => {
    for (const d of [-300, -100, 0, 150, 500]) {
      const p = wdlProbs(d);
      expect(p.win + p.draw + p.loss).toBeCloseTo(1, 6);
    }
    const strong = wdlProbs(300);
    expect(strong.win).toBeGreaterThan(strong.loss);
    const even = wdlProbs(0);
    expect(even.win).toBeCloseTo(even.loss, 6);
  });
  it("sampleScoreline is deterministic for a given seed", () => {
    const a = sampleScoreline(150, mulberry32(42));
    const b = sampleScoreline(150, mulberry32(42));
    expect(a).toEqual(b);
  });
});

describe("scorelineDist", () => {
  it("normalizes to ~1 and is sorted descending by probability", () => {
    const d = scorelineDist(0);
    const sum = d.reduce((s, x) => s + x.prob, 0);
    expect(sum).toBeCloseTo(1, 3);
    for (let i = 1; i < d.length; i++) expect(d[i].prob).toBeLessThanOrEqual(d[i - 1].prob);
  });
  it("favors the stronger side: top scorelines lean home when the rating gap is large", () => {
    const d = scorelineDist(400);
    const top = d[0];
    expect(top.h).toBeGreaterThanOrEqual(top.a);
    // mass on home-win scorelines should exceed away-win mass
    const homeWin = d.filter((x) => x.h > x.a).reduce((s, x) => s + x.prob, 0);
    const awayWin = d.filter((x) => x.h < x.a).reduce((s, x) => s + x.prob, 0);
    expect(homeWin).toBeGreaterThan(awayWin);
  });
  it("scoreline win/draw/loss mass matches wdlProbs for the same gap", () => {
    const gap = 180;
    const d = scorelineDist(gap, {}, 10);
    const win = d.filter((x) => x.h > x.a).reduce((s, x) => s + x.prob, 0);
    const draw = d.filter((x) => x.h === x.a).reduce((s, x) => s + x.prob, 0);
    const p = wdlProbs(gap);
    expect(win).toBeCloseTo(p.win, 2);
    expect(draw).toBeCloseTo(p.draw, 2);
  });
});
