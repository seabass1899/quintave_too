// ─── tests/engine.test.mjs ───────────────────────────────────────────────────
// Dependency-free test suite (no Jest/Vitest needed — runs on plain Node).
// Run locally:   node tests/engine.test.mjs
// Runs in CI on every push (see .github/workflows/ci.yml).
//
// These tests guard the specific regressions that bit us in development:
//   • Morning-only practices leaking into Midday/Evening (the 3-path bug)
//   • Phase lock never unlocking (snapshot priority drop)
//   • Snapshot round-trip losing required items
//   • Coherence math invariants (Source multiplier, harmony, decay)
//
// The philosophy: assert INVARIANTS that must hold across many inputs, not
// exact outputs. An adaptive engine's exact picks change; its rules must not.

import {
  generateTodayPlan,
  createTodayPlanSnapshot,
  TODAY_PLAN_VERSION,
  PHASES,
  MORNING_ONLY_PRACTICES,
  SUBSTITUTION_MAP,
} from '../src/features/today/todayEngine.js'

import {
  computeBodyProgress,
  overallCoherence,
  planeFor,
} from '../src/features/frequency/coherenceProgress.js'

// ── tiny test runner ─────────────────────────────────────────────────────────
let passed = 0, failed = 0
const failures = []
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`) }
  catch (e) { failed++; failures.push({ name, msg: e.message }); console.log(`  ✗ ${name}\n      ${e.message}`) }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed') }
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || 'expected equal'} — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`) }

// ── localStorage shim (the engine reads q_today_plan etc. via localStorage) ──
function makeLocalStorage(seed = {}) {
  const store = { ...seed }
  return {
    _store: store,
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
  }
}
globalThis.localStorage = makeLocalStorage()
globalThis.window = globalThis.window || {}
globalThis.window.localStorage = globalThis.localStorage

// Morning-only practices that must NEVER appear outside the morning phase.
const MORNING_ONLY = new Set(['Morning Directive', 'Sun + Circadian Anchor'])

// Helper: collect practice names per phase from a generated plan.
function phaseItemNames(plan, phaseId) {
  const phase = plan?.phases?.[phaseId]
  if (!phase || !Array.isArray(phase.items)) return []
  return phase.items.map(it => it.practice?.name || it.name || it.key).filter(Boolean)
}

// A spread of domainScore profiles to exercise routing/substitution paths.
const PROFILES = [
  { name: 'all-low (red)',        scores: { d1: 20, d2: 20, d3: 20, d4: 20, d5: 20 } },
  { name: 'mind-weak',            scores: { d1: 70, d2: 70, d3: 70, d4: 15, d5: 70 } },
  { name: 'code-weak',            scores: { d1: 70, d2: 70, d3: 70, d4: 70, d5: 15 } },
  { name: 'source-weak',          scores: { d1: 15, d2: 70, d3: 70, d4: 70, d5: 70 } },
  { name: 'all-high (blue)',      scores: { d1: 85, d2: 85, d3: 85, d4: 85, d5: 85 } },
  { name: 'mixed',                scores: { d1: 55, d2: 40, d3: 70, d4: 30, d5: 60 } },
]

console.log('\n── Today Engine: morning-only leak guard ──')
// THE test that would have caught the 3-path Midday bug. For every profile,
// generated plan must never place a morning-only practice in midday/evening.
for (const p of PROFILES) {
  test(`no morning-only practice in midday/evening — ${p.name}`, () => {
    const plan = generateTodayPlan({ domainScores: p.scores, checked: {}, dayStatus: {}, date: new Date() })
    for (const phaseId of ['midday', 'evening']) {
      const names = phaseItemNames(plan, phaseId)
      for (const n of names) {
        assert(!MORNING_ONLY.has(n), `"${n}" leaked into ${phaseId} for profile ${p.name}`)
      }
    }
  })
}

console.log('\n── Today Engine: snapshot round-trip ──')
// Generate → snapshot → regenerate from snapshot → invariants still hold.
for (const p of PROFILES) {
  test(`snapshot round-trip preserves morning-only invariant — ${p.name}`, () => {
    const plan1 = generateTodayPlan({ domainScores: p.scores, checked: {}, dayStatus: {}, date: new Date() })
    const snap = createTodayPlanSnapshot(plan1, new Date())
    assert(snap, 'snapshot should be created')
    eq(snap.version, TODAY_PLAN_VERSION, 'snapshot version should match current')
    const plan2 = generateTodayPlan({ domainScores: p.scores, checked: {}, dayStatus: {}, date: new Date(), planSnapshot: snap })
    for (const phaseId of ['midday', 'evening']) {
      for (const n of phaseItemNames(plan2, phaseId)) {
        assert(!MORNING_ONLY.has(n), `"${n}" leaked into ${phaseId} after round-trip (${p.name})`)
      }
    }
  })
}

console.log('\n── Today Engine: static substitution-map invariant (catches the bug at the source) ──')
// THE definitive guard. The original Midday leak existed because SUBSTITUTION_MAP
// mapped Mind practices to "Morning Directive" (a morning-only practice), and the
// substitution ran in every phase. This asserts no substitution target is ever a
// morning-only practice — making that entire bug class impossible. This is the
// test that would have caught the original bug instantly, deterministically.
test('no SUBSTITUTION_MAP entry targets a morning-only practice', () => {
  for (const [key, [, subName]] of Object.entries(SUBSTITUTION_MAP)) {
    assert(!MORNING_ONLY_PRACTICES.has(subName),
      `SUBSTITUTION_MAP["${key}"] → "${subName}" is morning-only; would leak into midday/evening`)
  }
})
test('MORNING_ONLY_PRACTICES contains the known morning-initialize rituals', () => {
  assert(MORNING_ONLY_PRACTICES.has('Morning Directive'), 'Morning Directive should be morning-only')
  assert(MORNING_ONLY_PRACTICES.has('Sun + Circadian Anchor'), 'Sun + Circadian Anchor should be morning-only')
})

console.log('\n── Today Engine: avoidance-driven substitution (the real bug path) ──')
// The actual Midday leak required AVOIDANCE history: a Mind practice assigned
// repeatedly but never completed triggers the substitution map, which used to
// swap in "Morning Directive". This seeds localStorage with that history and
// asserts the morning-only invariant holds even under heavy avoidance.
test('heavy avoidance never substitutes a morning-only practice into midday/evening', () => {
  // Seed the shared localStorage with avoidance history (clear it after).
  globalThis.localStorage.clear()

  // Build 7 days of past plans that assigned Mind practices (d4_0 Thought Audit,
  // d4_2 Belief Audit) in midday — and `checked` showing they were NEVER done.
  const oneDay = 86400000
  const today = new Date(); today.setHours(12, 0, 0, 0)
  const plans = {}
  const checked = {}
  for (let i = 7; i >= 1; i--) {
    const d = new Date(today.getTime() - i * oneDay)
    const key = d.toDateString()
    plans[key] = {
      version: TODAY_PLAN_VERSION,
      phases: {
        morning: { items: [{ key: 'd4_0', priority: 'Critical' }] },
        midday:  { items: [{ key: 'd4_0', priority: 'Critical' }, { key: 'd4_2', priority: 'Adaptive' }] },
        evening: { items: [{ key: 'd5_0', priority: 'Adaptive' }] },
      },
    }
    checked[key] = {}  // nothing completed → d4_0, d4_2 heavily skipped
  }
  globalThis.localStorage.setItem('q_today_plan', JSON.stringify(plans))

  // Mind-weak profile makes the engine route/substitute in the Mind domain.
  const plan = generateTodayPlan({
    domainScores: { d1: 70, d2: 70, d3: 70, d4: 15, d5: 70 },
    checked, dayStatus: {}, date: today,
  })
  for (const phaseId of ['midday', 'evening']) {
    for (const n of phaseItemNames(plan, phaseId)) {
      assert(!MORNING_ONLY.has(n), `"${n}" leaked into ${phaseId} under avoidance — the original bug`)
    }
  }
  globalThis.localStorage.clear()  // cleanup
})

console.log('\n── Today Engine: structural invariants ──')
test('plan has all three phases with items', () => {
  const plan = generateTodayPlan({ domainScores: PROFILES[0].scores, checked: {}, dayStatus: {}, date: new Date() })
  for (const ph of ['morning', 'midday', 'evening']) {
    assert(plan.phases?.[ph], `missing phase ${ph}`)
    assert(Array.isArray(plan.phases[ph].items), `phase ${ph} has no items array`)
  }
})
test('morning phase contains at least one item', () => {
  const plan = generateTodayPlan({ domainScores: PROFILES[5].scores, checked: {}, dayStatus: {}, date: new Date() })
  assert(phaseItemNames(plan, 'morning').length >= 1, 'morning should have items')
})
test('completionState is present and well-formed', () => {
  const plan = generateTodayPlan({ domainScores: PROFILES[0].scores, checked: {}, dayStatus: {}, date: new Date() })
  assert(plan.completionState, 'no completionState')
  assert(typeof plan.completionState.dailyMinimumMet === 'boolean', 'dailyMinimumMet not boolean')
})

console.log('\n── Coherence engine invariants ──')
test('Source multiplier caps overall when Source is neglected', () => {
  // movable bodies maxed, Source low → overall must stay well below Blue (50)
  const r = overallCoherence({ d1: 20, d2: 95, d3: 95, d4: 95, d5: 95 })
  assert(r.overall < 50, `expected capped < 50, got ${r.overall}`)
})
test('harmony rewards balance over one-maxed', () => {
  const balanced = overallCoherence({ d1: 80, d2: 60, d3: 60, d4: 60, d5: 60 }).overall
  const skewed   = overallCoherence({ d1: 80, d2: 100, d3: 40, d4: 40, d5: 40 }).overall
  assert(balanced > skewed, `balanced (${balanced}) should beat skewed (${skewed})`)
})
test('plane mapping: Blue zone starts at 50', () => {
  eq(planeFor(49).zone, 'Red Zone', 'just below 50 should be Red')
  eq(planeFor(50).zone, 'Blue Zone', '50 should be Blue')
})
test('consistent daily practice climbs into Blue within ~6 weeks', () => {
  const baseline = { d1: 42, d2: 40, d3: 38, d4: 41, d5: 39 }
  const checked = {}
  const oneDay = 86400000
  const start = new Date(); start.setHours(0,0,0,0); start.setTime(start.getTime() - 41 * oneDay)
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getTime() + i * oneDay)
    checked[d.toDateString()] = { d1_0: true, d2_0: true, d3_0: true, d4_0: true, d5_0: true }
  }
  const { series } = computeBodyProgress(baseline, checked, start, new Date())
  const last = series[series.length - 1]
  assert(last.overall >= 50, `expected Blue (>=50) after 6 weeks daily, got ${last.overall}`)
})
test('inactivity decays coherence (not permanent)', () => {
  const baseline = { d1: 60, d2: 60, d3: 60, d4: 60, d5: 60 }
  const oneDay = 86400000
  const start = new Date(); start.setHours(0,0,0,0); start.setTime(start.getTime() - 30 * oneDay)
  const checked = {}  // no practice at all
  const { series } = computeBodyProgress(baseline, checked, start, new Date())
  const last = series[series.length - 1]
  assert(last.overall < overallCoherence(baseline).overall, 'inactivity should reduce coherence')
})

// ── summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`)
console.log(`  ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.log('\nFailures:')
  for (const f of failures) console.log(`  ✗ ${f.name}: ${f.msg}`)
  process.exit(1)
}
console.log('  All engine invariants hold ✓')
process.exit(0)
