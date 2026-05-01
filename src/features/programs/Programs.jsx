import React, { useState, useEffect } from 'react'
import { DOMAINS, PRACTICES } from '../../data'

// Maps each week focus to specific recommended practice keys
const WEEK_PRACTICES = {
  // Gentle Foundation (30 days)
  'Establish the rhythm':      ['d1_1','d2_4','d3_2','d4_0','d5_0'],
  'Deepen the anchor':         ['d1_0','d1_1','d2_4','d4_0','d4_4'],
  'Notice the interference':   ['d3_0','d3_1','d5_0','d5_2','d4_2'],
  'Integration':               ['d1_1','d3_2','d4_0','d5_1','d1_2'],
  // Full Integration (60 days)
  'Full system orientation':   ['d1_1','d2_4','d3_0','d4_0','d5_0','d1_0'],
  'Primary interference work': ['d3_0','d3_1','d5_0','d5_2','d4_2','d3_6'],
  'Cross-domain integration':  ['d1_1','d2_4','d3_2','d4_4','d5_5'],
  'Rhythm deepening':          ['d4_0','d1_0','d2_0','d5_1','d3_2'],
  'Code work':                 ['d5_4','d5_0','d5_2','d5_7','d4_2'],
  'Source anchoring':          ['d1_0','d1_1','d1_4','d1_5','d1_3'],
  'Field clearing':            ['d3_4','d3_6','d3_0','d3_1','d5_4'],
  'Full coherence':            ['d1_1','d2_4','d3_2','d4_0','d5_1'],
  // Mastery (90 days)
  'Commitment installation':   ['d4_0','d4_4','d5_5','d1_1','d4_6'],
  'Morning Mode daily':        ['d1_1','d1_0','d2_4','d4_0','d4_4'],
  'Code excavation':           ['d5_4','d5_0','d5_2','d5_6','d5_7'],
  'Field completion':          ['d3_4','d3_0','d3_6','d3_1','d3_5'],
  'Source deepening':          ['d1_0','d1_1','d1_4','d1_5','d1_3'],
  'Form optimization':         ['d2_2','d2_0','d2_4','d2_5','d2_7'],
  'Intent installation':       ['d4_4','d4_6','d5_5','d4_0','d1_1'],
  'Relationship field':        ['d3_4','d3_0','d5_7','d3_6','d5_2'],
  'Shadow integration':        ['d5_4','d5_7','d3_4','d1_3','d5_2'],
  'Coherence consolidation':   ['d1_1','d2_4','d3_2','d4_0','d5_1'],
  'Expansion':                 ['d1_5','d1_4','d4_4','d5_5','d1_0'],
  'Embodiment':                ['d1_1','d1_0','d3_2','d4_0','d5_1'],
}

function getProgramPractices(weekFocus, checked) {
  const today = new Date().toDateString()
  const todayChecks = checked[today] || {}
  const keys = WEEK_PRACTICES[weekFocus] || []
  return keys.map(key => {
    try {
      const [domId, idx] = key.split('_')
      const domain = DOMAINS.find(d => d.id === domId)
      const practice = PRACTICES[domId]?.[parseInt(idx)]
      if (!domain || !practice) return null
      return { key, domain, practice, isDone: !!todayChecks[key] }
    } catch(e) { return null }
  }).filter(Boolean)
}

const PROGRAMS = [
  {
    id: 'gentle',
    name: 'Gentle Foundation',
    duration: 30,
    color: '#1D9E75',
    bg: '#E1F5EE',
    text: '#085041',
    icon: '♥',
    tagline: 'Build the foundation. One practice per body.',
    desc: 'Designed for those beginning their coherence journey. Five practices — one per frequency body — practiced consistently for 30 days. The goal is not completion. It is the building of a daily rhythm that holds.',
    practices: ['Stillness Exposure', 'Breathwork', 'Name + Locate Emotion', 'Morning Directive', 'Pattern Interrupt'],
    weeklyFocus: [
      { week: 1, focus: 'Establish the rhythm', instruction: 'Do not worry about depth this week. Simply show up. The habit of returning daily is the entire practice for week one.' },
      { week: 2, focus: 'Deepen the anchor', instruction: 'By now the routine is familiar. Begin to notice what each practice actually does to your state. Start logging your metric scores.' },
      { week: 3, focus: 'Notice the interference', instruction: 'Watch for the days when you do not want to practice. Those are the most important days. The resistance is the data.' },
      { week: 4, focus: 'Integration', instruction: 'The final week is about integration — not pushing harder, but letting what has been planted settle into the ground of your daily life.' },
    ],
    completion: 'You have built a foundation. 30 days of consistent practice is not a small thing — it is evidence that the commitment is real. From here, you are ready for Full Integration.',
  },
  {
    id: 'full',
    name: 'Full Integration',
    duration: 60,
    color: '#7F77DD',
    bg: '#EEEDFE',
    text: '#3C3489',
    icon: '◈',
    tagline: 'Engage the complete system. All five bodies.',
    desc: 'For those who have established a baseline practice and are ready to work the full system. All 36 practices become available. The coherence mirror begins to show meaningful data. This is where the real transformation happens.',
    practices: ['All Source practices', 'All Form practices', 'All Field practices', 'All Mind practices', 'All Code practices'],
    weeklyFocus: [
      { week: 1, focus: 'Full system orientation', instruction: 'Explore all five dimensions. Do not try to complete everything. Find your natural entry points in each domain.' },
      { week: 2, focus: 'Primary interference work', instruction: 'By now your primary interference domain is visible. Dedicate extra attention there — one additional practice per day from that body.' },
      { week: 3, focus: 'Cross-domain integration', instruction: 'Begin to notice how practices in one domain shift others. This is cross-impact becoming felt, not just measured.' },
      { week: 4, focus: 'Rhythm deepening', instruction: 'The three daily modes — Morning, Midday, Evening — should now feel natural. Use them as your primary structure.' },
      { week: 5, focus: 'Code work', instruction: 'Week five is dedicated to the subconscious layer. Shadow Work, Trigger Mapping, Inner Child. The deepest and most transformative territory.' },
      { week: 6, focus: 'Source anchoring', instruction: 'Return to Source as the center. After five weeks of body-level work, anchor it all in the eternal. The tuning fork holds everything.' },
      { week: 7, focus: 'Field clearing', instruction: 'Devote this week to emotional completion. Use the Forgiveness Protocol and Somatic Body Scan daily. Clear what the previous weeks surfaced.' },
      { week: 8, focus: 'Full coherence', instruction: 'The final two weeks are about sustained coherence — all five bodies, daily, without exception. This is what Whole feels like from the inside.' },
    ],
    completion: 'Sixty days of full-system engagement. Your coherence signature has shifted. The practices are no longer disciplines — they are becoming your natural way of moving through the world.',
  },
  {
    id: 'mastery',
    name: 'Mastery',
    duration: 90,
    color: '#D85A30',
    bg: '#FAECE7',
    text: '#712B13',
    icon: '✦',
    tagline: 'Sustain coherence. Embody the framework.',
    desc: 'Ninety days is the threshold at which new patterns become identity-level. This program is not about learning the framework — it is about becoming it. By the end, coherence is not something you practice. It is something you are.',
    practices: ['Full system + advanced protocols', 'Daily three-mode practice', 'Weekly coherence assessment', 'Monthly baseline retake'],
    weeklyFocus: [
      { week: 1, focus: 'Commitment installation', instruction: 'Write a one-sentence declaration of what you are committing to for the next 90 days. Place it where you will see it every morning.' },
      { week: 2, focus: 'Morning Mode daily', instruction: 'Every morning this week, complete the full Morning Mode sequence before engaging with anything external.' },
      { week: 3, focus: 'Code excavation', instruction: 'Identify the three deepest subconscious programs running your life. Name them precisely. This week you begin to rewrite them.' },
      { week: 4, focus: 'Field completion', instruction: 'Bring the Forgiveness Protocol to every unresolved relationship in your life. Not for them — for the charge you are carrying.' },
      { week: 5, focus: 'Source deepening', instruction: 'Add a second daily Source practice. Before sleep, practice Identity Decompression. Who are you beyond all the roles?' },
      { week: 6, focus: 'Form optimization', instruction: 'Audit your physical baseline. Sleep, nutrition, movement, cold exposure. The body is the platform — optimize it.' },
      { week: 7, focus: 'Intent installation', instruction: 'Define your primary intent for the next 12 months. Not a goal — a direction. Begin living from it now, as if it is already real.' },
      { week: 8, focus: 'Relationship field', instruction: 'Apply the framework to your most significant relationships. Where is there misalignment? What needs to be said or released?' },
      { week: 9, focus: 'Shadow integration', instruction: 'The shadow practices this week are not optional. What you refuse to see runs your life. Theta work daily.' },
      { week: 10, focus: 'Coherence consolidation', instruction: 'Three daily modes, every day, without exception. Notice what has become automatic. That automaticity is the installation.' },
      { week: 11, focus: 'Expansion', instruction: 'From this coherent place — what becomes possible that was not before? Begin moving toward it. Not as effort. As natural expression.' },
      { week: 12, focus: 'Embodiment', instruction: 'The final week is not about doing. It is about being. You are not practicing the framework anymore. You are it.' },
    ],
    completion: 'Ninety days. Three months of sustained coherence practice. You have crossed the threshold — this is no longer a program you completed. It is who you have become.',
  },
]

function useLS(key, def) {
  const [val, setVal] = useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def } catch { return def } })
  const save = v => { const nv = typeof v === 'function' ? v(val) : v; setVal(nv); try { localStorage.setItem(key, JSON.stringify(nv)) } catch {} }
  return [val, save]
}

export default function Programs({ checked, domainScores, onboardingProfile }) {
  const [activeProgram, setActiveProgram] = useLS('q_active_program', null)
  const [view, setView] = useState('overview') // overview | detail | active
  const [selectedProgram, setSelectedProgram] = useState(null)
  const bdr = '0.5px solid rgba(0,0,0,0.08)'

  const today = new Date().toDateString()

  // Compute program progress
  const getProgramProgress = () => {
    if (!activeProgram) return null
    const startDate = new Date(activeProgram.startDate)
    const now = new Date()
    const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24))
    const prog = PROGRAMS.find(p => p.id === activeProgram.id)
    if (!prog) return null
    const pct = Math.min(Math.round((daysPassed / prog.duration) * 100), 100)
    const currentWeek = Math.min(Math.ceil((daysPassed + 1) / 7), prog.weeklyFocus.length)
    const weekFocus = prog.weeklyFocus[currentWeek - 1]
    const daysLeft = Math.max(prog.duration - daysPassed, 0)
    const isComplete = daysPassed >= prog.duration
    return { daysPassed, pct, currentWeek, weekFocus, daysLeft, isComplete, prog }
  }

  const progress = getProgramProgress()
  const activeProg = activeProgram ? PROGRAMS.find(p => p.id === activeProgram.id) : null

  const startProgram = (prog) => {
    setActiveProgram({ id: prog.id, startDate: new Date().toISOString(), name: prog.name })
    setView('active')
  }

  const endProgram = () => {
    if (window.confirm('End this program? Your progress will be saved to history.')) {
      const history = (() => { try { return JSON.parse(localStorage.getItem('q_program_history') || '[]') } catch { return [] } })()
      history.push({ ...activeProgram, endDate: new Date().toISOString(), completed: progress?.isComplete })
      localStorage.setItem('q_program_history', JSON.stringify(history))
      setActiveProgram(null)
      setView('overview')
    }
  }

  // Overview
  if (view === 'overview' || (!activeProgram && view !== 'detail')) {
    return (
      <div>
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2 }}>Programs</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Structured journeys with a beginning, a direction, and a finish line. Choose the program that matches where you are.</div>
        </div>

        {/* Active program banner */}
        {activeProgram && progress && !progress.isComplete && (
          <div style={{ background: activeProg.bg, borderRadius: 14, border: `1.5px solid ${activeProg.color}30`, padding: '20px 22px', marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: activeProg.color, marginBottom: 6 }}>Active program</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: activeProg.text, marginBottom: 10 }}>{activeProg.icon} {activeProg.name}</div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: activeProg.color }}>{progress.daysPassed}</div><div style={{ fontSize: 11, color: '#888' }}>days in</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: activeProg.color }}>{progress.daysLeft}</div><div style={{ fontSize: 11, color: '#888' }}>days left</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: activeProg.color }}>{progress.pct}%</div><div style={{ fontSize: 11, color: '#888' }}>complete</div></div>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ height: 6, borderRadius: 99, background: activeProg.color, width: `${progress.pct}%`, transition: 'width 0.5s' }}/>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: activeProg.color, marginBottom: 4 }}>Week {progress.currentWeek} — {progress.weekFocus?.focus}</div>
              <div style={{ fontSize: 13, color: activeProg.text, lineHeight: 1.65 }}>{progress.weekFocus?.instruction}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setView('active')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: activeProg.color, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>View program →</button>
              <button onClick={endProgram} style={{ padding: '10px 16px', borderRadius: 8, border: bdr, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#888' }}>End</button>
            </div>
          </div>
        )}

        {/* Completion celebration */}
        {activeProgram && progress?.isComplete && (
          <div style={{ background: '#1a1a18', borderRadius: 14, padding: '24px 28px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{activeProg?.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: activeProg?.color, marginBottom: 8 }}>Program complete</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 12 }}>{activeProg?.name}</div>
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.7, marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>{activeProg?.completion}</div>
            <button onClick={endProgram} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: activeProg?.color, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Complete and archive →</button>
          </div>
        )}

        {/* Program cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PROGRAMS.map(prog => {
            const isActive = activeProgram?.id === prog.id
            return (
              <div key={prog.id} style={{ background: '#fff', borderRadius: 14, border: `${isActive ? '2px' : '0.5px'} solid ${isActive ? prog.color : 'rgba(0,0,0,0.08)'}`, padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: prog.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{prog.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{prog.name}</div>
                      <div style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, background: prog.bg, color: prog.text, fontWeight: 600 }}>{prog.duration} days</div>
                      {isActive && <div style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, background: prog.color, color: '#fff', fontWeight: 600 }}>active</div>}
                    </div>
                    <div style={{ fontSize: 12, color: prog.color, fontWeight: 500, marginBottom: 6 }}>{prog.tagline}</div>
                    <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.65 }}>{prog.desc}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  {prog.practices.map((p, i) => (
                    <div key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: prog.bg, color: prog.text }}>{p}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setSelectedProgram(prog); setView('detail') }}
                    style={{ padding: '8px 16px', borderRadius: 8, border: bdr, background: '#F7F6F3', fontSize: 13, cursor: 'pointer', color: '#5F5E5A' }}>
                    View program
                  </button>
                  {!activeProgram && (
                    <button onClick={() => startProgram(prog)}
                      style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: prog.color, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Begin {prog.name} →
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Detail view
  if (view === 'detail' && selectedProgram) {
    const prog = selectedProgram
    return (
      <div>
        <button onClick={() => setView('overview')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', fontSize: 13, color: '#888', cursor: 'pointer', marginBottom: 20, padding: 0 }}>← Back to programs</button>
        <div style={{ background: prog.color, borderRadius: 14, padding: '24px 28px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>{prog.duration}-day program</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{prog.icon} {prog.name}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>{prog.desc}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 14, border: bdr, padding: '20px 22px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Weekly arc</div>
          {prog.weeklyFocus.map((wk, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < prog.weeklyFocus.length - 1 ? bdr : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: prog.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: prog.text, flexShrink: 0 }}>W{wk.week}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18', marginBottom: 3 }}>{wk.focus}</div>
                <div style={{ fontSize: 12, color: '#5F5E5A', lineHeight: 1.6 }}>{wk.instruction}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: prog.bg, borderRadius: 12, border: `1px solid ${prog.color}20`, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: prog.color, marginBottom: 6 }}>On completion</div>
          <div style={{ fontSize: 13, color: prog.text, lineHeight: 1.7, fontStyle: 'italic' }}>{prog.completion}</div>
        </div>
        {!activeProgram ? (
          <button onClick={() => startProgram(prog)} style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: prog.color, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Begin {prog.name} →
          </button>
        ) : (
          <div style={{ fontSize: 13, color: '#888', textAlign: 'center', padding: '12px' }}>You have an active program. Complete or end it before starting a new one.</div>
        )}
      </div>
    )
  }

  // Active program view
  if (view === 'active' && activeProgram && progress) {
    const prog = progress.prog
    return (
      <div>
        <button onClick={() => setView('overview')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', fontSize: 13, color: '#888', cursor: 'pointer', marginBottom: 20, padding: 0 }}>← Overview</button>
        <div style={{ background: prog.color, borderRadius: 14, padding: '20px 24px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Day {progress.daysPassed + 1} of {prog.duration}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>{prog.icon} {prog.name}</div>
          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.2)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: 6, borderRadius: 99, background: '#fff', width: `${progress.pct}%` }}/>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{progress.pct}% complete · {progress.daysLeft} days remaining</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 14, border: bdr, padding: '20px 22px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: prog.color, marginBottom: 8 }}>Week {progress.currentWeek} focus</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a18', marginBottom: 8 }}>{progress.weekFocus?.focus}</div>
          <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.7 }}>{progress.weekFocus?.instruction}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 14, border: bdr, padding: '20px 22px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>All weeks</div>
          {prog.weeklyFocus.map((wk, i) => {
            const isPast = i < progress.currentWeek - 1
            const isCurrent = i === progress.currentWeek - 1
            return (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < prog.weeklyFocus.length - 1 ? bdr : 'none', opacity: isPast ? 0.45 : 1 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: isCurrent ? prog.color : isPast ? '#E5E3DE' : prog.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: isCurrent ? '#fff' : isPast ? '#888' : prog.text, flexShrink: 0 }}>
                  {isPast ? '✓' : `W${wk.week}`}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: isCurrent ? 600 : 400, color: isCurrent ? prog.color : '#1a1a18' }}>{wk.focus}</div>
                  {isCurrent && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{wk.instruction}</div>}
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={endProgram} style={{ width: '100%', padding: '12px', borderRadius: 10, border: bdr, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#888' }}>
          End program early
        </button>
      </div>
    )
  }

  return null
}
