import React, { useState } from 'react'
import { DOMAINS, PRACTICES } from '../../data'

// Intelligent daily practice recommendations
// Based on: weakest domain, streaks, time of day, active program, cross-impact

export function getDailyFocus({ checked, onboardingProfile, domainScores }) {
  const safeChecked = checked || {}
  const safeDomainScores = domainScores || {}
  const today = new Date().toDateString()
  const todayChecks = safeChecked[today] || {}
  const hour = new Date().getHours()

  // Score each practice by priority
  const scored = []

  DOMAINS.forEach(domain => {
    PRACTICES[domain.id].forEach((p, i) => {
      const key = `${domain.id}_${i}`
      const isDone = !!todayChecks[key]

      // Base score from domain weakness (weaker domain = higher priority)
      const domainScore = safeDomainScores[domain.id] || 0
      const weaknessBonus = Math.round((100 - domainScore) * 0.4)

      // Streak bonus — keep streaks alive
      let streak = 0
      const now = new Date()
      for (let j = 1; j < 30; j++) {
        const d = new Date(now); d.setDate(now.getDate() - j)
        if (safeChecked[d.toDateString()]?.[key]) streak++
        else break
      }
      const streakBonus = streak >= 6 ? 20 : streak >= 3 ? 10 : 0

      // Cross-impact bonus — high leverage practices score higher
      const crossBonus = (p.cross?.length || 0) * 8

      // Time of day affinity
      let timeBonus = 0
      const morningPracs = ['Stillness Exposure', 'Observer Drill', 'Morning Directive', 'Breathwork', 'Visualization Practice', 'Sun + Circadian Anchor', 'Affirmation Installation']
      const eveningPracs = ['Pre-Sleep Programming', 'Emotional Log', 'Gratitude + Reframe', 'Name + Locate Emotion', 'Dream Log', 'Somatic Body Scan']
      const middayPracs = ['5 Recall Triggers', 'Thought Audit', 'Pattern Interrupt', '8k+ Steps', 'Hydration Protocol']

      if (hour < 11 && morningPracs.includes(p.name)) timeBonus = 15
      if (hour >= 11 && hour < 16 && middayPracs.includes(p.name)) timeBonus = 15
      if (hour >= 18 && eveningPracs.includes(p.name)) timeBonus = 15

      // Never-done bonus — introduce new practices
      const totalDone = Object.keys(safeChecked).filter(dk => safeChecked[dk]?.[key]).length
      const neverDoneBonus = totalDone === 0 ? 12 : 0

      // Onboarding weakness bonus
      const baselineScore = onboardingProfile?.scores?.[domain.id] || 5
      const baselineBonus = Math.round((10 - baselineScore) * 3)

      const totalScore = weaknessBonus + streakBonus + crossBonus + timeBonus + neverDoneBonus + baselineBonus

      scored.push({
        ...p,
        key,
        domain,
        isDone,
        score: totalScore,
        streak,
        totalDone,
        reasons: {
          weakness: weaknessBonus > 20,
          streak: streakBonus > 0,
          highLeverage: crossBonus >= 16,
          timeOfDay: timeBonus > 0,
          neverDone: neverDoneBonus > 0,
        }
      })
    })
  })

  // Sort by score, separate done from not done
  const notDone = scored.filter(p => !p.isDone).sort((a, b) => b.score - a.score)
  const done = scored.filter(p => p.isDone).sort((a, b) => b.score - a.score)

  // Return top 7 undone + all done
  return { recommended: notDone.slice(0, 7), done, allScored: scored }
}

export default function DailyFocus({ checked = {}, setChecked, onboardingProfile, domainScores = {}, onBreathwork }) {
  const [showAll, setShowAll] = useState(false)
  const safeChecked = checked || {}
  const today = new Date().toDateString()
  const todayChecks = safeChecked[today] || {}
  const hour = new Date().getHours()
  const timeLabel = hour < 11 ? 'morning' : hour < 16 ? 'midday' : 'evening'

  const { recommended, done } = getDailyFocus({ checked, onboardingProfile, domainScores })

  const handleCheck = (key, domain) => {
    const wasChecked = !!todayChecks[key]
    setChecked(prev => ({
      ...prev,
      [today]: { ...(prev[today] || {}), [key]: !wasChecked }
    }))
  }

  const bdr = '0.5px solid rgba(0,0,0,0.08)'
  const visible = showAll ? recommended : recommended.slice(0, 5)

  const getReason = (p) => {
    if (p.reasons.highLeverage) return `⚡ lifts ${p.cross?.length} dimensions`
    if (p.reasons.timeOfDay) return `◎ ideal for ${timeLabel}`
    if (p.reasons.weakness) return `↑ your growth edge`
    if (p.reasons.neverDone) return `✦ not yet explored`
    if (p.reasons.streak) return `🔥 streak active`
    return `◈ recommended today`
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: bdr, padding: '16px 18px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Today's focus</div>
        <div style={{ fontSize: 11, color: '#888' }}>
          {done.length}/{done.length + recommended.length} complete
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>
        Intelligently selected based on your coherence signature, streaks, and time of day.
      </div>

      {/* Recommended practices */}
      {visible.map((p, i) => (
        <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: bdr }}>
          <div onClick={() => handleCheck(p.key, p.domain)}
            style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${p.domain.color}`, background: 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a18' }}>{p.name}</span>
              <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: p.domain.bg, color: p.domain.text }}>{p.domain.name}</span>
            </div>
            <div style={{ fontSize: 11, color: p.domain.color, marginTop: 1 }}>{getReason(p)}</div>
          </div>
          {p.streak > 0 && (
            <div style={{ fontSize: 11, fontWeight: 600, color: p.streak >= 7 ? '#D85A30' : '#1D9E75', flexShrink: 0 }}>
              {p.streak >= 7 ? '🔥' : '✦'}{p.streak}d
            </div>
          )}
          {p.hasTimer && (
            <button onClick={onBreathwork}
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: `0.5px solid ${p.domain.color}40`, background: p.domain.bg, color: p.domain.text, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ▶
            </button>
          )}
        </div>
      ))}

      {recommended.length > 5 && (
        <button onClick={() => setShowAll(v => !v)}
          style={{ width: '100%', padding: '8px', marginTop: 4, background: 'none', border: bdr, borderRadius: 8, fontSize: 12, color: '#888', cursor: 'pointer' }}>
          {showAll ? 'Show fewer' : `Show ${recommended.length - 5} more recommendations`}
        </button>
      )}

      {/* Completed today */}
      {done.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: bdr }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#888', marginBottom: 8 }}>Completed today</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {done.map(p => (
              <div key={p.key} onClick={() => handleCheck(p.key, p.domain)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: p.domain.bg, border: `0.5px solid ${p.domain.color}30`, cursor: 'pointer' }}>
                <span style={{ fontSize: 10, color: '#1D9E75' }}>✓</span>
                <span style={{ fontSize: 11, color: p.domain.text, fontWeight: 500 }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recommended.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: '#888' }}>
          ✦ All recommended practices complete. Outstanding.
        </div>
      )}
    </div>
  )
}
