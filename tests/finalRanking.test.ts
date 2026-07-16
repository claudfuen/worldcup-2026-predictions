import { describe, it, expect } from "vitest"
import { computeFinalRanking, finalRankingReady } from "../lib/finalRanking"
import type { MatchInfo } from "../lib/predictions"

// Minimal MatchInfo factory — only the fields computeFinalRanking reads. Codes are REAL team codes because
// the ranking is over the fixed 48-team field (lib/data/teams).
function m(part: Partial<MatchInfo>): MatchInfo {
  return {
    match: 0,
    round: "GROUP",
    utc: "2026-06-11T00:00:00Z",
    venue: "",
    city: "",
    home: null,
    away: null,
    homeName: null,
    awayName: null,
    defined: true,
    status: "scheduled",
    ...part,
  } as MatchInfo
}

describe("finalRankingReady", () => {
  it("is false before any knockout result", () => {
    expect(
      finalRankingReady([
        m({
          round: "GROUP",
          status: "final",
          home: "ESP",
          away: "FRA",
          homeScore: 1,
          awayScore: 0,
        }),
      ])
    ).toBe(false)
  })
  it("is true once a knockout match is final", () => {
    expect(
      finalRankingReady([
        m({
          round: "R32",
          status: "final",
          home: "ESP",
          away: "FRA",
          homeScore: 1,
          awayScore: 0,
          winner: "ESP",
        }),
      ])
    ).toBe(true)
  })
})

describe("computeFinalRanking — points & tiebreakers", () => {
  it("counts a group win and a regulation KO win as 3, a penalty KO as a draw (1 each)", () => {
    const matches = [
      m({
        round: "GROUP",
        status: "final",
        home: "ESP",
        away: "FRA",
        homeScore: 2,
        awayScore: 0,
      }), // ESP +3
      m({
        round: "R32",
        status: "final",
        home: "ESP",
        away: "ARG",
        homeScore: 1,
        awayScore: 0,
        winner: "ESP",
      }), // ESP +3 (reg win)
      // KO decided on penalties: level 1-1, ESP advances → counts as a DRAW for both.
      m({
        round: "R16",
        status: "final",
        home: "ESP",
        away: "ENG",
        homeScore: 1,
        awayScore: 1,
        winner: "ESP",
        homePens: 4,
        awayPens: 3,
      }),
    ]
    const esp = computeFinalRanking(matches).find((x) => x.code === "ESP")!
    expect(esp.points).toBe(7) // 3 + 3 + 1
    expect(esp.win).toBe(2)
    expect(esp.draw).toBe(1)
    expect(esp.gf).toBe(4)
    expect(esp.ga).toBe(1)
  })

  it("orders a same-stage tier by points, then GD, then goals scored", () => {
    // Three teams all knocked out in the QF, differing only on tiebreakers (BRA > POR on goals, both > GHA on points).
    const matches = [
      // BRA: 6 pts, GD +5, GF 6
      m({
        round: "GROUP",
        status: "final",
        home: "BRA",
        away: "URU",
        homeScore: 3,
        awayScore: 0,
      }),
      m({
        round: "R32",
        status: "final",
        home: "BRA",
        away: "MEX",
        homeScore: 3,
        awayScore: 0,
        winner: "BRA",
      }),
      m({
        round: "QF",
        status: "final",
        home: "BRA",
        away: "ESP",
        homeScore: 0,
        awayScore: 1,
        winner: "ESP",
      }),
      // POR: 6 pts, GD +2, GF 4
      m({
        round: "GROUP",
        status: "final",
        home: "POR",
        away: "CRO",
        homeScore: 2,
        awayScore: 0,
      }),
      m({
        round: "R32",
        status: "final",
        home: "POR",
        away: "GER",
        homeScore: 2,
        awayScore: 1,
        winner: "POR",
      }),
      m({
        round: "QF",
        status: "final",
        home: "POR",
        away: "ESP",
        homeScore: 0,
        awayScore: 2,
        winner: "ESP",
      }),
      // GHA: 3 pts
      m({
        round: "GROUP",
        status: "final",
        home: "GHA",
        away: "JPN",
        homeScore: 1,
        awayScore: 0,
      }),
      m({
        round: "R32",
        status: "final",
        home: "GHA",
        away: "USA",
        homeScore: 0,
        awayScore: 1,
        winner: "USA",
      }),
      m({
        round: "QF",
        status: "final",
        home: "GHA",
        away: "ESP",
        homeScore: 0,
        awayScore: 3,
        winner: "ESP",
      }),
    ]
    const r = computeFinalRanking(matches)
    const order = r
      .filter((x) => ["BRA", "POR", "GHA"].includes(x.code))
      .map((x) => x.code)
    expect(order).toEqual(["BRA", "POR", "GHA"])
    expect(
      r
        .filter((x) => ["BRA", "POR", "GHA"].includes(x.code))
        .every((x) => x.tier === "QF")
    ).toBe(true)
  })

  it("holds the finalists at an unsettled 1–2 range until the final is played", () => {
    const matches = [
      m({
        round: "SF",
        status: "final",
        home: "ESP",
        away: "FRA",
        homeScore: 1,
        awayScore: 0,
        winner: "ESP",
      }),
      m({
        round: "SF",
        status: "final",
        home: "ARG",
        away: "ENG",
        homeScore: 1,
        awayScore: 0,
        winner: "ARG",
      }),
      m({ round: "FINAL", status: "scheduled", home: "ESP", away: "ARG" }),
      m({ round: "3P", status: "scheduled", home: "FRA", away: "ENG" }),
    ]
    const r = computeFinalRanking(matches)
    const esp = r.find((x) => x.code === "ESP")!
    expect(esp.tier).toBe("FINAL")
    expect(esp.settled).toBe(false)
    expect([esp.rankLo, esp.rankHi]).toEqual([1, 2])
    const fra = r.find((x) => x.code === "FRA")!
    expect(fra.tier).toBe("THIRD")
    expect([fra.rankLo, fra.rankHi]).toEqual([3, 4])
  })

  it("settles champion/runner-up and 3rd/4th once those matches are played", () => {
    const matches = [
      m({
        round: "SF",
        status: "final",
        home: "ESP",
        away: "FRA",
        homeScore: 1,
        awayScore: 0,
        winner: "ESP",
      }),
      m({
        round: "SF",
        status: "final",
        home: "ARG",
        away: "ENG",
        homeScore: 1,
        awayScore: 0,
        winner: "ARG",
      }),
      m({
        round: "3P",
        status: "final",
        home: "FRA",
        away: "ENG",
        homeScore: 2,
        awayScore: 1,
        winner: "FRA",
      }),
      m({
        round: "FINAL",
        status: "final",
        home: "ESP",
        away: "ARG",
        homeScore: 0,
        awayScore: 1,
        winner: "ARG",
      }),
    ]
    const r = computeFinalRanking(matches)
    expect(r.find((x) => x.code === "ARG")!.outcome).toBe("champion")
    expect(r.find((x) => x.code === "ARG")!.rank).toBe(1)
    expect(r.find((x) => x.code === "ESP")!.outcome).toBe("runnerUp")
    expect(r.find((x) => x.code === "ESP")!.rank).toBe(2)
    expect(r.find((x) => x.code === "FRA")!.rank).toBe(3)
    expect(r.find((x) => x.code === "ENG")!.rank).toBe(4)
  })
})
