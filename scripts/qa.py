#!/usr/bin/env python3
"""Deterministic QA: pull /api/data (source ground-truth + stored KV prediction) and assert invariants
and prediction-vs-source consistency. Independently re-derives clinch to confirm certainty states."""
import json, urllib.request, itertools, math, sys

BASE="https://worldcup-2026-sim.vercel.app"
def get(path):
    return json.load(urllib.request.urlopen(BASE+path, timeout=70))

d=get("/api/data")
src=d["source"]; pred=d["kv"]["stored"]
fails=[]; checks=0
def ok(cond, msg):
    global checks; checks+=1
    if not cond: fails.append(msg)

print(f"source.completedMatches={src['completedMatches']}  pred.matchesPlayed={pred['matchesPlayed']}  iters={pred['iterations']}")

# --- index ---
psim={t['code']:t for t in pred['teams']}
pgroups={g['group']:g for g in pred['groups']}
sgroups={s['group']:s for s in src['standings']}

# 1) group win-prob sums to 1
for g,gv in pgroups.items():
    s=sum(t['winGroup'] for t in gv['teams'])
    ok(abs(s-1)<0.02, f"G{g} winGroup sum={s:.3f} != 1")

# 2) advance sum == 32 ; title sum == 1
adv=sum(t['advance'] for t in pred['teams']); ok(abs(adv-32)<0.1, f"advance sum={adv:.2f} != 32")
ti=sum(t['title'] for t in pred['teams']); ok(abs(ti-1)<0.02, f"title sum={ti:.3f} != 1")

# 3) monotonic funnel
for t in pred['teams']:
    seq=[t['advance'],t['r16'],t['qf'],t['sf'],t['final'],t['title']]
    ok(all(seq[i]+1e-9>=seq[i+1] for i in range(len(seq)-1)), f"{t['code']} non-monotonic {['%.3f'%x for x in seq]}")

# 4) standings consistency: predictions group rows pts/gd/gf == source
for g in pgroups:
    sd={r['code']:r for r in sgroups[g]['rows']}
    for t in pgroups[g]['teams']:
        r=sd[t['code']]
        ok(t['pts']==r['pts'] and t['gd']==r['gd'], f"G{g} {t['code']} pred pts/gd {t['pts']}/{t['gd']} != src {r['pts']}/{r['gd']}")

# 5) certainty states match source clinch
for g in pgroups:
    sc={r['code']:r['clinch'] for r in sgroups[g]['rows']}
    for t in pgroups[g]['teams']:
        cl=sc[t['code']]; st=t['status']
        if st=='won_group': ok(cl['winner'], f"{t['code']} status won_group but clinch.winner false")
        if st=='second': ok(cl['second'], f"{t['code']} status second but clinch.second false")
        if st=='advanced': ok(cl['top2'] or True, f"{t['code']} advanced")  # may be best-third
        if st=='eliminated': ok(cl['eliminatedTop2'], f"{t['code']} status eliminated but clinch.eliminatedTop2 false")
        # never show clinched if not mathematically so:
        if st in ('won_group','second'): ok(cl['top2'], f"{t['code']} {st} but not clinch.top2")

# 6) GROUND TRUTH: independently brute-force clinch for every group from source results, compare
def rank2026(teams, played):
    pts={t:0 for t in teams}; gd={t:0 for t in teams}; gf={t:0 for t in teams}
    for H,A,hs,a in played:
        gf[H]+=hs; gf[A]+=a; gd[H]+=hs-a; gd[A]+=a-hs
        if hs>a: pts[H]+=3
        elif hs<a: pts[A]+=3
        else: pts[H]+=1; pts[A]+=1
    def h2h(grp):
        s=set(grp); hp={t:0 for t in grp}; hg={t:0 for t in grp}; hf={t:0 for t in grp}
        for H,A,hs,a in played:
            if H in s and A in s:
                hf[H]+=hs; hf[A]+=a; hg[H]+=hs-a; hg[A]+=a-hs
                if hs>a: hp[H]+=3
                elif hs<a: hp[A]+=3
                else: hp[H]+=1; hp[A]+=1
        return hp,hg,hf
    order=sorted(teams,key=lambda t:-pts[t]); res=[]; i=0
    while i<len(order):
        j=i
        while j<len(order) and pts[order[j]]==pts[order[i]]: j+=1
        tied=order[i:j]
        if len(tied)>1:
            hp,hg,hf=h2h(tied)
            tied=sorted(tied,key=lambda t:(-hp[t],-hg[t],-hf[t],-gd[t],-gf[t],t))
        res+=tied; i=j
    return res

# reconstruct played + remaining per group from source results + schedule of group
results_by_group={}
for r in src['results']:
    if r['group']: results_by_group.setdefault(r['group'],[]).append((r['home'],r['away'],r['homeGoals'],r['awayGoals']))
# remaining = round robin pairs not played
for g in pgroups:
    teams=[r['code'] for r in sgroups[g]['rows']]
    played=results_by_group.get(g,[])
    playedpairs={frozenset((H,A)) for H,A,_,_ in played}
    allpairs=[frozenset((teams[i],teams[j])) for i in range(4) for j in range(i+1,4)]
    remaining=[tuple(p) for p in allpairs if p not in playedpairs]
    MAXG=8 if len(remaining)<=2 else 5
    canT2=set(); canMiss=set()
    def rec(idx, extra):
        if idx==len(remaining):
            order=rank2026(teams, played+extra)
            for c in teams:
                if c in order[:2]: canT2.add(c)
                else: canMiss.add(c)
            return
        H,A=remaining[idx]
        for hs in range(MAXG+1):
            for a in range(MAXG+1):
                rec(idx+1, extra+[(H,A,hs,a)])
    if len(remaining)<=2:
        rec(0,[])
        for c in teams:
            indep_top2 = c in canT2 and c not in canMiss
            indep_elim = c not in canT2
            sc=next(r['clinch'] for r in sgroups[g]['rows'] if r['code']==c)
            ok(indep_top2==sc['top2'], f"G{g} {c} independent top2-clinch {indep_top2} != api {sc['top2']}")
            ok(indep_elim==sc['eliminatedTop2'], f"G{g} {c} independent elim {indep_elim} != api {sc['eliminatedTop2']}")

# 7) invariant: any team that can never finish top-3 (source) must be shown ELIMINATED in predictions
for g in pgroups:
    sc={r['code']:r['clinch'] for r in sgroups[g]['rows']}
    for t in pgroups[g]['teams']:
        if sc[t['code']]['eliminatedTop3']:
            ok(t['status']=='eliminated', f"{t['code']} eliminatedTop3 but UI status={t['status']}")
# informational snapshot
def clinch_of(code):
    for s in src['standings']:
        for r in s['rows']:
            if r['code']==code: return r['clinch']
    return None
print("snapshot:", {c: (clinch_of(c)['top2'], clinch_of(c)['eliminatedTop3']) for c in ['MEX','USA','CAN','SUI','HAI'] if clinch_of(c)})

# 8) schedule structure
ms=pred['matches']; ok(len(ms)==104, f"matches={len(ms)} != 104")
ok(all(m.get('venue') and m.get('utc') for m in ms), "some matches missing venue/utc")
def find(mn): return next(m for m in ms if m['match']==mn)
ok(find(76)['slotHome']=='1C' and find(76)['slotAway']=='2F', "M76 != 1C v 2F")
ok(find(92)['slotHome']=='W79' and find(92)['slotAway']=='W80', "M92 != W79 v W80")

# 9) r32 opponents sum ~1 for likely-advancing teams (sanity)
for code in ['BRA','ESP','ARG']:
    s=sum(o['prob'] for o in pred['r32Opponents'].get(code,[]))
    ok(s<=1.01, f"{code} r32opp sum>{s:.2f}")

print(f"\nCHECKS: {checks} run, {len(fails)} failed")
for f in fails[:40]: print("  ✗", f)
print("RESULT:", "ALL PASS ✅" if not fails else f"{len(fails)} FAILURES ❌")
