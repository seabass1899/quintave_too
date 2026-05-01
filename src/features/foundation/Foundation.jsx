import React, { useState } from 'react'

const PRINCIPLES = [
  {
    id: 'nature',
    number: '01',
    title: 'What You Are',
    icon: '✦',
    color: '#7F77DD',
    bg: '#EEEDFE',
    text: '#3C3489',
    summary: 'You are not a human having a spiritual experience. You are a conscious, creative expression of Source — having a human experience.',
    body: [
      'At the deepest level of reality, there is one thing: Source. Not a being, not an external authority — but total, infinite, conscious creative energy. Everything that exists, exists within it. Nothing is outside of it.',
      'Source expresses itself through individuated points of awareness — what this framework calls fractals. Each fractal is conscious, creative, and derived from the same total field. You are one of those expressions.',
      'You are not separate from Source. You are not a creation of Source. You are Source — localized. The difference between you and the totality is not one of nature but of scale. A wave is not separate from the ocean. It is the ocean, expressed.',
      'This is not a belief system. It is a description of structure. And it changes everything about how you understand your capacity, your purpose, and what is actually possible for you here.',
    ],
  },
  {
    id: 'game',
    number: '02',
    title: 'The Game You Entered',
    icon: '◎',
    color: '#378ADD',
    bg: '#E6F1FB',
    text: '#0C447C',
    summary: 'This reality is a constructed experiential system. You entered it intentionally. The forgetting was part of the design.',
    body: [
      'The reality you are currently experiencing is not the total field of Source. It is a constructed environment — a contained experiential system with specific conditions that do not exist in the same way outside of it.',
      'Those conditions include: sensory depth, emotional polarity, perceived separation, and time-based causality. These features make the experience unique. Outside of this system, there is no emotional contrast — only neutral creative capacity. Here, you experience the full range.',
      'You entered this system intentionally. Before entry, your awareness of your true nature was restricted — a veil of forgetfulness was installed. You do not remember your origin, your total nature, or your participation in constructing the system itself.',
      'This is not a flaw. It is required for genuine immersion. If you maintained full awareness of what you are, the experience would collapse. The forgetting is part of the design. And the remembering — which you are now engaged in — is what this entire journey is about.',
    ],
  },
  {
    id: 'bodies',
    number: '03',
    title: 'The Five Game Pieces',
    icon: '⊡',
    color: '#1D9E75',
    bg: '#E1F5EE',
    text: '#085041',
    summary: 'You navigate this experience through five distinct bodies. The soul is the anchor. The other four are the instruments through which it plays.',
    body: [
      'To participate in this experience, you operate through five distinct bodies — each with its own frequency, its own function, and its own vulnerabilities to distortion.',
      'The Source Fractal — the soul itself — is your anchor point. Deathless, eternal, and complete. It does not need development. It needs to be remembered. When you access it, everything else stabilizes around it.',
      'The four remaining bodies — Form (physical), Field (emotional), Mind (conscious), and Code (subconscious) — orbit the soul and are continuously pulled in different directions by the circumstances of this life. They are the instruments through which the soul plays.',
      'The purpose of this practice system is not to fix what is broken. It is to bring all four instruments into coherence with the soul — so that the full creative capacity of who you are can be expressed through this experience, unobstructed.',
    ],
  },
  {
    id: 'veil',
    number: '04',
    title: 'The Veil and the Noise',
    icon: '∿',
    color: '#BA7517',
    bg: '#FAEEDA',
    text: '#633806',
    summary: 'The veil of forgetfulness was installed at entry. But the modern world adds another layer: constant noise that keeps the connection to Source perpetually suppressed.',
    body: [
      'The veil of forgetfulness is structural — it was installed as part of the design of entry into this system. Every fractal carries it. It is what makes genuine immersion possible.',
      'But in the modern world, there is a second layer on top of the structural veil: engineered distraction. Notifications, content feeds, constant stimulation, artificial light, noise — each one is a small but continuous pull away from Source awareness.',
      'The nervous system requires a drop below reactive beta brainwave activity to access the stillness where Source is found. Every notification resets that process. Every scroll reactivates the dopamine circuit. The environment is designed — not maliciously, but effectively — to prevent the very state in which Source access becomes natural.',
      'This is why the practices in this system are not optional luxuries. They are acts of deliberate recalibration — creating the conditions in which the connection to what you actually are can be felt, sustained, and built upon. Silence is not empty. It is the medium through which remembrance travels.',
    ],
  },
  {
    id: 'coherence',
    number: '05',
    title: 'What Coherence Actually Means',
    icon: '◈',
    color: '#D85A30',
    bg: '#FAECE7',
    text: '#712B13',
    summary: 'Coherence is not a wellness metric. It is the degree to which all five bodies are aligned with the Source Fractal — and therefore with what you actually are.',
    body: [
      'Coherence, as used in this system, is not a measure of how many habits you completed today. It is a measure of alignment — how closely your four frequency bodies are resonating with the Source Fractal at their center.',
      'When all five bodies are in coherence, several things happen simultaneously: emotional reactivity decreases because the Field is clear. Subconscious programs lose their grip because Code is being rewritten toward the soul\'s frequency. The conscious mind operates with clarity and intention. The physical body is maintained as a high-functioning instrument. And beneath all of it, Source awareness is the stable ground.',
      'This state is not rare or reserved for the spiritually advanced. It is the natural condition of a being that is not being pulled apart by interference. The practices in this system are interference removal — clearing what stands between you and the coherence that is already your nature.',
      'Abundance, health, and freedom are not goals you achieve from the outside. They are what naturally emerges when a being in this system is operating from coherence. This is the reflection principle in action: your internal state generates your external experience. Coherence generates coherent circumstances.',
    ],
  },
  {
    id: 'reflection',
    number: '06',
    title: 'The Reflection Principle',
    icon: '☽',
    color: '#5B4FCF',
    bg: '#EEEDFE',
    text: '#3C3489',
    summary: 'This system operates as a mirror. Your internal state is not just influenced by external reality — it generates it.',
    body: [
      'This experiential system operates on a fundamental principle: your internal state is reflected externally. This is not metaphorical. It is functional. The environment mirrors the orientation of the participant.',
      'When anger is the dominant frequency, environments of conflict appear. When resistance is the state, friction multiplies. When clarity and coherence are the state, flow increases, synchronicity appears, and circumstances begin to reflect the inner alignment.',
      'This is why the work of coherence is not escapism or spiritual bypassing. It is the most practical thing a person can do. Changing external circumstances without changing internal state produces temporary results — the external will eventually mirror the internal again. But changing internal state changes the generative source, and the external follows.',
      'Everything you encounter in this experience is, at some level, a reflection of the frequency you are broadcasting. Not as punishment or reward — but as structural consequence. You are not a passive observer of this reality. You are a co-creator of it. And Quintave is the daily practice of becoming a more conscious, coherent, intentional one.',
    ],
  },
  {
    id: 'remembrance',
    number: '07',
    title: 'The Journey of Remembrance',
    icon: '✦',
    color: '#7F77DD',
    bg: '#EEEDFE',
    text: '#3C3489',
    summary: 'You are not here to become something you are not. You are here to remember what you have always been.',
    body: [
      'The journey this system supports is not one of self-improvement in the conventional sense. You are not trying to become worthy, enlightened, or complete. You are already all of those things at the level of the Source Fractal.',
      'The journey is one of remembrance — the gradual, practice-by-practice process of bringing the surface experience of your life into alignment with the deeper truth of what you are. Every session of stillness practice is a remembering. Every pattern interrupt is a reclaiming. Every act of emotional processing is a clearing of static from the signal.',
      'The veil does not lift all at once. It thins — gradually, consistently, through sustained practice. There will be moments of profound clarity where you touch what you actually are with certainty. There will be other moments where the game pulls you back in and the signal dims. Both are part of the experience.',
      'What this system gives you is a daily structure for keeping the signal strong — for returning, again and again, to the practices that thin the veil and amplify the connection. Not because you are broken. Because you came here to experience this fully, and full experience from alignment is what your best life actually is.',
    ],
  },,
  {
    id: 'frequency',
    number: '08',
    title: 'Frequency Planes',
    icon: '∿',
    color: '#BA7517',
    bg: '#FAEEDA',
    text: '#633806',
    summary: 'This reality operates across layered frequency bands. Your internal state — not your circumstances — determines which layer you are effectively operating from.',
    body: [
      'The experiential reality you navigate is not uniform. It operates across structured frequency layers — from dense, reactive, emotionally-driven states at the lower end, to neutral, observational, less-reactive states at the upper end. These are not physical locations. They are states of alignment that determine your experience output.',
      'What determines your position within these layers is not your external circumstances — your income, your relationships, your environment. It is your internal state. Your frequency — the quality of your dominant thoughts, emotions, and beliefs — positions you in the experiential layer you are effectively operating from.',
      'This is why two people can experience the same objective event and have completely different realities. They are not in the same version of the game. Their internal positioning places them in overlapping but distinct experiential fields.',
      'The coherence practices in this system are frequency tools. Every practice that clears the Field, sharpens the Mind, or anchors Source access moves your operating position upward — from reactive and dense toward clear and intentional. This is not metaphor. It is the actual mechanism of how your experience changes.',
    ],
  },
  {
    id: 'control',
    number: '09',
    title: 'The Mind as Control Interface',
    icon: '◈',
    color: '#378ADD',
    bg: '#E6F1FB',
    text: '#0C447C',
    summary: 'Your mind is not a passive observer of reality. It is the primary control interface — the mechanism through which internal state generates external experience.',
    body: [
      'This system is fundamentally cognitive-interactive. Your mind is not watching reality happen to you — it is participating in the generation of reality through a precise cascade: Thought shapes perception. Perception shapes emotion. Emotion shapes decisions. Decisions shape outcomes. Which means your experience is downstream of your thinking patterns, not upstream of them.',
      'This has a specific implication: uncontrolled thought is not neutral. It is not harmless background noise. Fear loops, worst-case projections, chronic negative self-talk — these are not just unpleasant. They are active inputs into the system that generates your experience. What you repeatedly imagine, you are conditioning your system toward.',
      'Controlled thought, by contrast, is one of the most powerful levers available. Not positive thinking — deliberate thinking. The examined belief. The chosen focus. The intentional narrative. These inputs generate different outputs through the same causal chain.',
      'The Mind practices in Quintave are not productivity tools. They are control interface training — the systematic practice of becoming the conscious director of the system that generates your reality, rather than its unwitting passenger.',
    ],
  },
  {
    id: 'energy',
    number: '10',
    title: 'The Energy Economy',
    icon: '♥',
    color: '#1D9E75',
    bg: '#E1F5EE',
    text: '#085041',
    summary: 'You operate on a finite, regenerating energy budget. Every reaction, every distraction, every emotional spike has a measurable cost. Coherence is what you can access when the budget is protected.',
    body: [
      'Every interaction with your environment has an energy cost. Drama drains it. Conflict consumes it. External fixation reduces the internal reserves available for deliberate creation. This is not poetic language — it is a functional description of how your capacity for coherent action is maintained or depleted across a day.',
      'Emotion is the most significant variable in the energy economy. Not emotion itself — uncontrolled emotional engagement. Anger drains control. Fear fragments attention. Obsessive thinking locks perception into a narrow band. Each of these is an energy expenditure that reduces your coherence capacity for hours afterward.',
      'The noise and distraction practices in this system — Low Passive Consumption, the daily Noise Audit, boundary-setting with destabilizing environments — are not about becoming antisocial or indifferent. They are energy management. Every input you do not consume is capacity retained for intentional use.',
      'Attention is where the energy goes. Where your attention rests, your energy flows. This is why the practices of deliberate focus — Morning Directive, Deep Work Block, Visualization Practice — are not just productivity techniques. They are the deliberate allocation of your most finite and regenerating resource toward what you have actually chosen to build.',
    ],
  },
  {
    id: 'intent',
    number: '11',
    title: 'Intent as the Execution Force',
    icon: '✦',
    color: '#7F77DD',
    bg: '#EEEDFE',
    text: '#3C3489',
    summary: 'Intent is not a thought or a wish. It is a committed directive — the moment a possibility becomes a decision. It is what translates thought into movement in reality.',
    body: [
      'Most people operate at the level of preference or desire — "I would like this to happen." True intent is different. It is the moment a possibility becomes a decision. At that point, the mind aligns, attention stabilizes, and action begins organizing itself around the committed direction. Intent is what converts thought into reality movement.',
      'Intent operates in layers. Passive intent is weak and inconsistent — it has no structural impact on outcomes. Directed intent has a clear outcome defined with repeated focus — it begins shaping behavior. Embedded intent is identity-level alignment with no internal resistance — at this level, execution becomes automatic. You do not try to make things happen. You move as if they already are.',
      'Visualization is not fantasy — it is pre-experiencing a state. When done with sensory and emotional realism, you simulate the outcome internally, condition familiarity with it, and reduce the internal resistance to its execution. But visualization only works when it is stable, repeated, and aligned with action. Otherwise it becomes escapism.',
      'Intent behaves like a muscle — weak when inconsistent, strong when reinforced. You build it through small repeatable confirmations, follow-through on decisions, and the elimination of internal contradiction. Eventually your intent becomes reliable, and reality begins to reflect that reliability. This is not magic. It is the compounding of deliberate execution over time.',
    ],
  }
]

export default function Foundation() {
  const [expanded, setExpanded] = useState(null)
  const bdr = '0.5px solid rgba(0,0,0,0.08)'

  const scrollTo = (id) => {
    const el = document.getElementById(`foundation-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2 }}>The Foundation</div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>The philosophical bedrock of the Quintave system.</div>
        <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.7, background: '#fff', borderRadius: 12, border: bdr, padding: '14px 18px', marginBottom: 14 }}>
          This section is not required reading. It is here for those who want to understand not just <em>what</em> the practices do — but <em>why</em> they work, and what they are actually in service of. Read at your own pace. Return when you are ready for more.
        </div>
        {/* Sticky index */}
        <div style={{ background: '#fff', borderRadius: 12, border: bdr, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginRight: 4 }}>Jump to:</div>
          {PRINCIPLES.map(p => (
            <button key={p.id} onClick={() => scrollTo(p.id)}
              style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, border: `0.5px solid ${p.color}40`, background: p.bg, color: p.text, cursor: 'pointer', fontWeight: 500 }}>
              {p.number} {p.title}
            </button>
          ))}
        </div>
      </div>

      {PRINCIPLES.map((p, i) => {
        const isOpen = expanded === p.id
        return (
          <div key={p.id} id={`foundation-${p.id}`} style={{ background: '#fff', borderRadius: 14, border: bdr, marginBottom: 10, overflow: 'hidden' }}>

            {/* Header row */}
            <div onClick={() => setExpanded(isOpen ? null : p.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', cursor: 'pointer', background: isOpen ? p.bg : '#fff', transition: 'background 0.25s' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: p.color, opacity: 0.5, minWidth: 20 }}>{p.number}</div>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: isOpen ? 'rgba(255,255,255,0.6)' : p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: isOpen ? p.text : '#1a1a18', marginBottom: 3 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: isOpen ? p.text : '#888', lineHeight: 1.5, opacity: isOpen ? 0.85 : 1 }}>{p.summary}</div>
              </div>
              <div style={{ fontSize: 18, color: p.color, opacity: 0.6, flexShrink: 0, transition: 'transform 0.25s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>↓</div>
            </div>

            {/* Expanded body */}
            {isOpen && (
              <div style={{ padding: '0 20px 22px', borderTop: `0.5px solid ${p.color}20` }}>
                <div style={{ marginTop: 18 }}>
                  {p.body.map((para, pi) => (
                    <div key={pi} style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.8, marginBottom: pi < p.body.length - 1 ? 14 : 0 }}>
                      {para}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Closing card */}
      <div style={{ background: '#1a1a18', borderRadius: 14, padding: '24px 28px', marginTop: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888780', marginBottom: 12 }}>A final word</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.7, marginBottom: 12 }}>
          You are not here by accident. You are not separate. You are not powerless.
        </div>
        <div style={{ fontSize: 13, color: '#C0BEBA', lineHeight: 1.8, marginBottom: 16 }}>
          You are a localized expression of total creative energy, operating within a structured experiential system, with the ability to influence your experience through alignment. The system does not need to change. Your orientation within it does.
        </div>
        <div style={{ fontSize: 13, color: '#C0BEBA', lineHeight: 1.8 }}>
          That is what this practice is for. Not self-improvement. Remembrance.
        </div>
      </div>
    </div>
  )
}
