// ─── Single source of truth for all shared data ───────────────────────────────
// Import from here in every component. Never duplicate.

export const DOMAINS = [
  { id: 'd1', name: 'Source', icon: '✦', color: '#7F77DD', bg: '#EEEDFE', text: '#3C3489',
    desc: 'The eternal and infinite dimension of pure being — deathless, boundless, beyond space and time.',
    label: 'SOURCE ·', headline: 'The eternal self',
    sub: 'Source is the awareness beneath all thought — deathless, boundless, the tuning fork everything else calibrates to. These questions measure your current access to that dimension.',
    questions: [
      { q: 'Generally speaking, how often do you experience a sense of awareness or presence beneath your thoughts — a quiet observer that is not caught in the noise?', low: 'Rarely — I am almost always identified with my thoughts and reactions', high: 'Often — I regularly rest as the awareness behind experience', angle: 'Presence depth', dimension: 'typical' },
      { q: 'This week specifically, how accessible has inner stillness or a calm observing presence been for you?', low: 'Barely accessible — my mind has been unusually loud or reactive this week', high: 'Easily accessible — stillness has been present and available this week', angle: 'Stillness access', dimension: 'current' },
      { q: 'When you are under significant pressure or stress, what tends to happen to your connection with that inner stillness?', low: 'It disappears entirely — pressure consumes me completely', high: 'It remains available — I can observe even intense states without being swept away', angle: 'Pressure stability', dimension: 'behavioral' },
    ] },
  { id: 'd2', name: 'Form', icon: '♥', color: '#1D9E75', bg: '#E1F5EE', text: '#085041',
    desc: 'The physical dimension of matter and energy — the vessel optimized through movement, sleep, and recovery.',
    label: 'FORM ·', headline: 'The physical vessel',
    sub: 'Form is the instrument the soul chose. Its quality determines how much energy is available for everything else. These questions measure how well you are maintaining the vessel.',
    questions: [
      { q: 'In general, how well do you maintain your physical foundation — sleep, movement, and nutrition — as a consistent daily practice?', low: 'Poorly — sleep, movement, and nutrition are inconsistent most of the time', high: 'Well — these are reliable daily habits that support my energy', angle: 'Physical foundation', dimension: 'typical' },
      { q: 'This week, how would you rate your physical energy, sleep quality, and overall vitality?', low: 'Low — this week I have felt physically depleted, poorly rested, or under-fuelled', high: 'High — this week my body has felt strong, rested, and energized', angle: 'Current vitality', dimension: 'current' },
      { q: 'When life gets demanding or stressful, what tends to suffer first in your physical self-care?', low: 'Everything breaks down — sleep, movement, and nutrition all collapse under pressure', high: 'Very little — I maintain the basics even under significant pressure', angle: 'Stress resilience', dimension: 'behavioral' },
    ] },
  { id: 'd3', name: 'Field', icon: '∿', color: '#BA7517', bg: '#FAEEDA', text: '#633806',
    desc: 'The emotional dimension of resonance and charge — processed, regulated, and integrated daily.',
    label: 'FIELD ·', headline: 'The emotional body',
    sub: 'Field is the emotional dimension — resonance, charge, and the energetic atmosphere you carry. These questions measure how clearly your Field is functioning.',
    questions: [
      { q: 'Generally, how well do you process and move emotional experiences — naming them, feeling them, and letting them pass rather than suppressing or carrying them?', low: 'Poorly — I tend to suppress, avoid, or carry emotional charge for extended periods', high: 'Well — emotions move through me and I rarely accumulate carried charge', angle: 'Emotional processing', dimension: 'typical' },
      { q: 'This week, how would you describe your emotional field — how much stored charge, reactivity, or emotional weight are you currently carrying?', low: 'Heavy — this week I am carrying significant emotional charge, tension, or reactivity', high: 'Clear — this week my emotional field feels settled, processed, and light', angle: 'Current charge', dimension: 'current' },
      { q: 'When difficult emotions arise — grief, anger, resentment — what tends to happen?', low: 'They accumulate — I push them down and they build into carried charge over days or weeks', high: 'They move through — I can feel and process them without being controlled or overwhelmed', angle: 'Charge response', dimension: 'behavioral' },
    ] },
  { id: 'd4', name: 'Mind', icon: '◈', color: '#378ADD', bg: '#E6F1FB', text: '#0C447C',
    desc: 'The conscious dimension of thought and will — where intention, belief, and deliberate focus are formed.',
    label: 'MIND ·', headline: 'The conscious director',
    sub: 'Mind is the conscious interface — where intention, belief, and deliberate focus are formed. These questions measure how deliberately your Mind is operating.',
    questions: [
      { q: 'Generally, how deliberately do you direct your mental focus — setting intentions, choosing what to think about, and operating from conscious direction rather than autopilot?', low: 'Rarely — my mind runs on autopilot and reacts to whatever arises', high: 'Consistently — I direct my attention intentionally and catch drift quickly', angle: 'Mental direction', dimension: 'typical' },
      { q: 'This week specifically, how focused and intentional has your mind been — or has it felt scattered, reactive, or difficult to direct?', low: 'Scattered — this week my mind has been reactive, fragmented, or difficult to settle', high: 'Clear — this week I have felt focused, intentional, and mentally directed', angle: 'Current clarity', dimension: 'current' },
      { q: 'When your schedule gets disrupted or life gets chaotic, what tends to happen to your mental clarity and intention-setting?', low: 'It collapses — chaos makes deliberate thinking nearly impossible', high: 'It holds — I can maintain mental direction even in disruption', angle: 'Chaos resilience', dimension: 'behavioral' },
    ] },
  { id: 'd5', name: 'Code', icon: '☽', color: '#D85A30', bg: '#FAECE7', text: '#712B13',
    desc: 'The subconscious dimension of programming and pattern — the hidden operating system governing all behavior.',
    label: 'CODE ·', headline: 'The subconscious system',
    sub: 'Code is the operating system — the subconscious patterns governing 95% of behavior below awareness. These questions measure how consciously you relate to your programming.',
    questions: [
      { q: 'Generally, how aware are you of the automatic behavioral patterns that shape your responses — the habitual loops that run below conscious awareness?', low: 'Largely unaware — my behavior often surprises or frustrates me in retrospect', high: 'Clearly aware — I can name my core patterns and see them operating in real time', angle: 'Pattern awareness', dimension: 'typical' },
      { q: 'This week, how much have your automatic patterns been running your behavior — old reactions, unconscious loops, or behavior that contradicts your intentions?', low: 'Heavily — this week old patterns have been running much of my behavior', high: 'Minimally — this week I have been catching and redirecting patterns before they complete', angle: 'Current pattern activity', dimension: 'current' },
      { q: 'When you are tired, stressed, or emotionally activated, how much control do you have over your automatic behavioral responses?', low: 'Very little — stress or fatigue make old patterns nearly impossible to interrupt', high: 'Significant — even under pressure I can catch patterns early and choose differently', angle: 'Pattern resilience', dimension: 'behavioral' },
    ] }
]


export const PRACTICES = {
  d1: [
    { name: 'Observer Drill', target: '10 min', metric: 'Distraction detection time ↓', cross: ['d4','d5'] },
    { name: 'Stillness Exposure', target: '20 min', metric: 'Depth score 1–10', cross: ['d3','d4','d5'] },
    { name: '5 Recall Triggers', target: '5 pauses', metric: '% completed', cross: ['d5'] },
    { name: 'Identity Decompression', target: '3 prompts', metric: 'Beliefs identified', cross: ['d4','d5'] },
    { name: 'Deathlessness Contemplation', target: '10 min', metric: 'Depth of recognition 1–10', cross: ['d4','d5'] },
    { name: 'Non-Local Body Scan', target: '10 min', metric: 'Expansion felt 1–10', cross: ['d2','d3'] },
  ],
  d2: [
    { name: '8k+ Steps', target: '8,000+', metric: 'Steps completed', cross: ['d3'] },
    { name: 'Protein Target', target: '0.7–1g/lb', metric: '% target hit', cross: [] },
    { name: 'Sleep 7h+', target: '7+ hrs', metric: 'Sleep duration', cross: ['d3','d4','d5'] },
    { name: 'Training / Mobility', target: '30–60 min', metric: 'Session complete', cross: ['d3'] },
    { name: 'Breathwork', target: '5–10 min', metric: 'HRV or stress score', cross: ['d1','d3'], hasTimer: true },
    { name: 'Cold Exposure', target: '2–5 min', metric: 'Recovery time ↓', cross: ['d3','d5'] },
    { name: 'Hydration Protocol', target: '2–3L water', metric: 'Litres consumed', cross: [] },
    { name: 'Sun + Circadian Anchor', target: '10 min AM', metric: 'Morning light exposure', cross: ['d3','d4'] },
  ],
  d3: [
    { name: 'Name + Locate Emotion', target: '1 event', metric: 'Intensity 1–10', cross: ['d5'] },
    { name: 'Emotional Log', target: '3 events', metric: 'Patterns detected', cross: ['d4'] },
    { name: 'Gratitude + Reframe', target: '3 + 1', metric: 'Mood baseline', cross: ['d4'] },
    { name: 'Controlled Stress Exposure', target: '2–5 min', metric: 'Recovery time ↓', cross: ['d2','d5'] },
    { name: 'Forgiveness Protocol', target: '1 session', metric: 'Charge level 1–10', cross: ['d5'] },
    { name: '90-Second Rule', target: '1+ activation', metric: 'Completion without suppression', cross: ['d5'] },
    { name: 'Somatic Body Scan', target: '10 min', metric: 'Tension released 1–10', cross: ['d1','d5'] },
  ],
  d4: [
    { name: 'Morning Directive', target: '1 intention', metric: 'Alignment score 1–10', cross: ['d5'] },
    { name: 'Deep Work Block', target: '60+ min', metric: 'Output produced', cross: [] },
    { name: 'Thought Audit', target: '5 thoughts', metric: '% useful thoughts', cross: ['d5'] },
    { name: 'Low Passive Consumption', target: '<60 min', metric: 'Screen time', cross: ['d5'] },
    { name: 'Visualization Practice', target: '10 min', metric: 'Vividness 1–10', cross: ['d1','d3','d5'] },
    { name: 'Belief Audit', target: '1 belief examined', metric: 'Clarity gained 1–10', cross: ['d5'] },
    { name: 'Daily Mantra Installation', target: '5 min', metric: 'Resonance felt 1–10', cross: ['d5','d1'] },
  ],
  d5: [
    { name: 'Pattern Interrupt', target: '1+ interrupt', metric: 'Successful interrupts', cross: ['d3','d4'] },
    { name: 'Pre-Sleep Programming', target: '5 min', metric: 'Next-day alignment', cross: ['d4'] },
    { name: 'Trigger Mapping', target: '1 map', metric: 'Override success %', cross: ['d3'] },
    { name: 'Habit Stack', target: '1 anchor', metric: 'Streak length', cross: ['d2'] },
    { name: 'Theta / Shadow Work', target: '20–30 min', metric: 'Insight depth 1–10', cross: ['d1'] },
    { name: 'Affirmation Installation', target: '5 min', metric: 'Felt conviction 1–10', cross: ['d4','d1'] },
    { name: 'Dream Log', target: '1 entry on waking', metric: 'Symbols / themes noted', cross: ['d1','d3'] },
    { name: 'Inner Child Check-In', target: '10 min', metric: 'Safety felt 1–10', cross: ['d3','d4'] },
  ],
}

export const DOMAIN_META = {
  d1: {
    philosophy: 'Source is the only frequency body that requires no building — only uncovering. The practices here are not creating something new. They are removing the interference that obscures what already exists: boundless, deathless awareness that was never harmed, never diminished, and never actually left.',
    mastery_thresholds: [
      { level: 'Accessed', score: 40, desc: 'You can reach observer awareness intentionally in calm conditions for brief periods.' },
      { level: 'Stable', score: 60, desc: 'Observer awareness is accessible within 2 minutes of intention in most conditions.' },
      { level: 'Embodied', score: 80, desc: 'Source is your default operating state. You notice when you have left it and return quickly.' },
      { level: 'Anchored', score: 95, desc: 'You live from Source consistently, including under pressure, conflict, and uncertainty.' },
    ],
    feeds: ['d2','d3','d4','d5'],
    fed_by: [],
    interference: ['Constant mental noise', 'Identification with roles and outcomes', 'Absence of stillness practice', 'Over-stimulation'],
  },
  d2: {
    philosophy: 'The body is the instrument the Soul chose for this experience. It is not a vehicle to be managed — it is a sacred technology that, when properly maintained, becomes a source of vitality that amplifies every other dimension. The Form practices are not about appearance. They are about the quality of the signal the vessel can carry.',
    mastery_thresholds: [
      { level: 'Rebuilding', score: 40, desc: 'Sleep, movement, and nutrition are becoming consistent. Energy is stabilizing.' },
      { level: 'Functional', score: 60, desc: '7h+ sleep most nights, daily movement, adequate protein. The vessel is maintained.' },
      { level: 'Optimized', score: 80, desc: 'The body is performing — consistent energy, recovery, and physical resilience across the week.' },
      { level: 'Thriving', score: 95, desc: 'The physical instrument is a source of vitality, not friction. Form supports every other dimension.' },
    ],
    feeds: ['d3','d4'],
    fed_by: ['d1','d5'],
    interference: ['Sleep deprivation', 'Poor nutrition', 'Sedentary behavior', 'Chronic stress without recovery'],
  },
  d3: {
    philosophy: 'The emotional body is not a problem to be solved — it is a guidance system to be read. Every emotion is frequency information about the state of your field. The Field practices are not about becoming unemotional. They are about becoming emotionally fluid — able to feel fully, process cleanly, and release completely without accumulating charge.',
    mastery_thresholds: [
      { level: 'Noticing', score: 40, desc: 'You are beginning to name emotions rather than being entirely consumed by them.' },
      { level: 'Processing', score: 60, desc: 'Most emotional activations are named, located, and released within the same day.' },
      { level: 'Integrating', score: 80, desc: 'Emotion moves through you cleanly. Charge rarely accumulates overnight.' },
      { level: 'Clear', score: 95, desc: 'The Field is largely free of stored charge. You are a clear emotional conductor.' },
    ],
    feeds: ['d4','d5'],
    fed_by: ['d1','d2'],
    interference: ['Suppressing or avoiding emotion', 'Rumination and replaying', 'Unresolved conflict', 'Emotional numbing'],
  },
  d4: {
    philosophy: 'The conscious mind is the most underutilized resource most people have. It defaults to reactivity, repetition, and the amplification of whatever the subconscious Code is running. The Mind practices are about reclaiming the director\'s chair — choosing what to think, what to believe, and where to place attention.',
    mastery_thresholds: [
      { level: 'Aware', score: 40, desc: 'You are beginning to notice your thought patterns rather than being fully identified with them.' },
      { level: 'Directing', score: 60, desc: 'Morning Directive is consistent. Thought audits reveal your dominant mental patterns.' },
      { level: 'Deliberate', score: 80, desc: 'Your conscious mind operates with sustained intention. Reactive thinking is the exception.' },
      { level: 'Generative', score: 95, desc: 'Your mind creates rather than reacts. Beliefs are chosen. Focus is a resource you command.' },
    ],
    feeds: ['d5'],
    fed_by: ['d1','d2','d3'],
    interference: ['Passive content consumption', 'Unexamined beliefs', 'Fragmented attention', 'Negative self-talk'],
  },
  d5: {
    philosophy: 'Code is the most invisible and most influential dimension. The programs running your behavior were not chosen by you — they were installed by your environment before your conscious mind could evaluate them. The Code practices are about becoming the programmer of your own operating system.',
    mastery_thresholds: [
      { level: 'Seeing', score: 40, desc: 'You can identify at least 3 automatic programs running your behavior.' },
      { level: 'Interrupting', score: 60, desc: 'You regularly catch patterns before they fully execute and choose differently.' },
      { level: 'Rewriting', score: 80, desc: 'Several previously automatic patterns have been replaced by chosen responses, held for 30+ days.' },
      { level: 'Liberated', score: 95, desc: 'Your behavior is primarily conscious and chosen. Old programs no longer run without your awareness.' },
    ],
    feeds: ['d3','d2'],
    fed_by: ['d1','d4'],
    interference: ['Unexamined repetitive behavior', 'Trauma responses', 'Negative self-concept', 'Unconscious limiting beliefs'],
  },
}

export const COHERENCE_STATES = [
  { label: 'Scattered',   min: 0,  max: 20, color: '#E24B4A', bg: '#FCEBEB', desc: 'The five bodies are pulling in different directions with no coherent center. Life feels reactive, heavy, and driven by circumstance rather than intention.' },
  { label: 'Stirring',    min: 21, max: 40, color: '#BA7517', bg: '#FAEEDA', desc: 'Something is waking up. The interference patterns are becoming visible. You are beginning to sense there is more to who you are than circumstances have suggested.' },
  { label: 'Grounding',   min: 41, max: 60, color: '#378ADD', bg: '#E6F1FB', desc: 'The practices are anchoring. Each frequency body is finding its natural rhythm. You are building a foundation that will hold — this is where the deepest work happens.' },
  { label: 'Aligning',    min: 61, max: 80, color: '#7F77DD', bg: '#EEEDFE', desc: 'All five bodies are moving into coherence with each other. Life is beginning to reflect what is happening inside. Synchronicity increases. Clarity deepens.' },
  { label: 'Whole',       min: 81, max: 100, color: '#1D9E75', bg: '#E1F5EE', desc: 'All five frequency bodies are in sustained coherence. Abundance, health, and freedom are not goals being pursued — they are natural expressions of a being in full alignment.' },
]

export function getCoherenceState(score) {
  return COHERENCE_STATES.find(s => score >= s.min && score <= s.max) || COHERENCE_STATES[0]
}

export function getCoherenceScore(domainScores) {
  const s1 = (domainScores?.d1 || 0) * 1.5
  const s2 = (domainScores?.d2 || 0) + (domainScores?.d3 || 0) + (domainScores?.d4 || 0) + (domainScores?.d5 || 0)
  return Math.round((s1 + s2) / 6.5)
}
