import React, { useState, useEffect, useRef } from 'react'

// ─── Static data ──────────────────────────────────────────────────────────────

const NODES = [
  {
    id: 'd1', name: 'Source', icon: '✦', color: '#7F77DD', bg: '#EEEDFE', text: '#3C3489',
    x: 50, y: 50, // percent of container
    role: 'The tuning fork',
    desc: 'The eternal and infinite dimension of pure being. Source does not need development — it needs to be remembered. It is the reference frequency everything else calibrates to. When Source resonates clearly, all other bodies find their alignment faster.',
    feeds: ['d2','d3','d4','d5'],
    depleted_by: ['Constant identification with thought', 'Over-stimulation and noise', 'Disconnection from stillness', 'Living entirely in doing rather than being'],
    top_practices: ['Stillness Exposure', 'Observer Drill', '5 Recall Triggers'],
    cascade: 'When Source dims → the other four bodies lose their reference frequency. Anxiety increases, emotion becomes harder to process, mind becomes reactive, and subconscious programs run unchecked.',
  },
  {
    id: 'd2', name: 'Form', icon: '♥', color: '#1D9E75', bg: '#E1F5EE', text: '#085041',
    x: 82, y: 28,
    role: 'The physical vessel',
    desc: 'The physical dimension of matter and energy. The Soul chose this body as its instrument for this experience. A depleted instrument cannot produce coherent sound — no amount of spiritual practice compensates for a chronically exhausted body.',
    feeds: ['d3','d4'],
    depleted_by: ['Sleep deprivation', 'Poor nutrition', 'Sedentary behavior', 'Chronic stress without recovery', 'Substance use'],
    top_practices: ['Sleep 7h+', 'Breathwork', 'Training / Mobility'],
    cascade: 'When Form collapses → stress hormones suppress Source access, emotional regulation fails, cognitive function diminishes, and willpower depletes — making Code reprogramming nearly impossible.',
  },
  {
    id: 'd3', name: 'Field', icon: '∿', color: '#BA7517', bg: '#FAEEDA', text: '#633806',
    x: 82, y: 72,
    role: 'The emotional body',
    desc: 'The emotional dimension of resonance and charge. Emotion is frequency moving through the body. When it moves freely — named, felt, and released — the Field is clear. Suppressed emotion becomes stored charge that distorts the entire frequency signature.',
    feeds: ['d4','d5'],
    depleted_by: ['Suppressing or avoiding emotion', 'Rumination and replaying', 'Unresolved conflict', 'Chronic anger or grief', 'Emotional numbing'],
    top_practices: ['Name + Locate Emotion', 'Forgiveness Protocol', 'Gratitude + Reframe'],
    cascade: 'When Field holds charge → it colors every thought (Mind distortion), embeds emotional programs into Code, and creates a persistent interference pattern that blocks Source access even during meditation.',
  },
  {
    id: 'd4', name: 'Mind', icon: '◈', color: '#378ADD', bg: '#E6F1FB', text: '#0C447C',
    x: 18, y: 28,
    role: 'The conscious director',
    desc: 'The conscious dimension of thought and will. Mind is the layer of deliberate intention and examined belief. A clear Mind amplifies Source. A reactive Mind amplifies fear. Without deliberate direction, the Mind defaults to whatever the subconscious Code is running.',
    feeds: ['d5'],
    depleted_by: ['Passive content consumption', 'Unexamined beliefs', 'Reactive thinking loops', 'Fragmented attention', 'Negative self-talk'],
    top_practices: ['Morning Directive', 'Thought Audit', 'Visualization Practice'],
    cascade: 'When Mind is reactive → it amplifies every lower-frequency input from Field and Code. Limiting beliefs feel like facts. Emotional charge feels like reality. Subconscious patterns feel impossible to change.',
  },
  {
    id: 'd5', name: 'Code', icon: '☽', color: '#D85A30', bg: '#FAECE7', text: '#712B13',
    x: 18, y: 72,
    role: 'The operating system',
    desc: 'The subconscious dimension of programming and pattern. Code was written before age 7 and runs 95% of behavior automatically. It is the hidden architecture beneath every relationship, every financial pattern, every health behavior — operating entirely below conscious awareness.',
    feeds: ['d3','d2'],
    depleted_by: ['Unexamined repetitive behavior', 'Trauma responses', 'Negative self-concept', 'Unconscious limiting beliefs', 'Chronic low-vibration environments'],
    top_practices: ['Pattern Interrupt', 'Theta / Shadow Work', 'Pre-Sleep Programming'],
    cascade: 'When Code runs unchecked → it generates the same experiences repeatedly regardless of conscious intention. New habits fail. Old patterns return. The ceiling on what feels possible stays fixed.',
  },
]

// Connection lines between nodes
const CONNECTIONS = [
  // Source feeds all
  { from: 'd1', to: 'd2', label: 'grounds the vessel' },
  { from: 'd1', to: 'd3', label: 'stabilizes the field' },
  { from: 'd1', to: 'd4', label: 'clarifies thought' },
  { from: 'd1', to: 'd5', label: 'rewrites programs' },
  // Form feeds Field and Mind
  { from: 'd2', to: 'd3', label: 'regulates emotion' },
  { from: 'd2', to: 'd4', label: 'fuels clarity' },
  // Field feeds Mind and Code
  { from: 'd3', to: 'd4', label: 'clears mental static' },
  { from: 'd3', to: 'd5', label: 'releases stored charge' },
  // Mind feeds Code
  { from: 'd4', to: 'd5', label: 'installs new programs' },
  // Code feeds back to Field and Form (subconscious patterns)
  { from: 'd5', to: 'd3', label: 'generates emotional patterns' },
  { from: 'd5', to: 'd2', label: 'drives physical habits' },
]

// ─── Pulse animation helper ───────────────────────────────────────────────────

function usePulse(interval = 2000) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), interval)
    return () => clearInterval(t)
  }, [interval])
  return tick
}

// ─── Main SystemMap ───────────────────────────────────────────────────────────

export default function SystemMap({ domainScores, onboardingProfile }) {
  const [selected, setSelected] = useState(null)
  const [hoveredConnection, setHoveredConnection] = useState(null)
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ w: 600, h: 420 })
  const tick = usePulse(1800)

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth
        setDims({ w, h: Math.max(380, Math.min(w * 0.7, 520)) })
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const selectedNode = NODES.find(n => n.id === selected)
  const bdr = '0.5px solid rgba(0,0,0,0.08)'

  // Map percent coords to pixel coords
  const px = (pct) => (pct / 100) * dims.w
  const py = (pct) => (pct / 100) * dims.h

  // Get resonance level 0-1 for a domain
  // Blends daily practice score with onboarding baseline
  // On day 1 (no practices logged), shows onboarding baseline
  // As practices accumulate, practice scores take precedence
  const resonance = (id) => {
    const practiceScore = domainScores?.[id] || 0
    // Onboarding baseline: score was 1-10, convert to 0-100
    const baselineScore = onboardingProfile?.scores?.[id]
      ? (onboardingProfile.scores[id] / 10) * 100
      : 50 // neutral default if no onboarding
    // If practice score exists, blend: 70% practice, 30% baseline
    // If no practices yet (score = 0), use baseline fully
    const blended = practiceScore > 0
      ? Math.round(practiceScore * 0.7 + baselineScore * 0.3)
      : baselineScore
    return blended / 100
  }

  // Whether we are showing baseline or live scores
  const isBaselineMode = Object.values(domainScores || {}).every(s => s === 0)

  // Node radius based on resonance
  const nodeR = (id) => {
    const base = id === 'd1' ? 36 : 28
    const r = resonance(id)
    return base + r * 10
  }

  // Connection opacity based on source resonance
  const connOpacity = (fromId) => 0.15 + resonance(fromId) * 0.5

  // Animate flow dots along connections
  const flowOffset = (idx) => ((tick * 0.3 + idx * 0.7) % 1)

  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2 }}>System Map</div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
          The five frequency bodies and how they interact. Node size reflects your current resonance. Tap any body to explore its role.
        </div>
        {isBaselineMode && (
          <div style={{ fontSize: 12, color: '#7F77DD', background: '#EEEDFE', borderRadius: 8, padding: '6px 12px', marginBottom: 12, display: 'inline-block' }}>
            ✦ Showing your onboarding baseline — node sizes will shift as you complete daily practices
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? '1fr 1fr' : '1fr', gap: 14, alignItems: 'start' }}>

        {/* ── Map SVG ── */}
        <div ref={containerRef} style={{ background: '#fff', borderRadius: 14, border: bdr, padding: 0, overflow: 'hidden', position: 'relative' }}>
          <svg width="100%" height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}
            style={{ display: 'block', cursor: 'default' }}>

            {/* Background subtle grid */}
            <defs>
              <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F4F3F0" stopOpacity="0"/>
                <stop offset="100%" stopColor="#ECEAE5" stopOpacity="0.4"/>
              </radialGradient>
              {NODES.map(n => (
                <radialGradient key={n.id} id={`glow_${n.id}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={n.color} stopOpacity={0.15 + resonance(n.id) * 0.25}/>
                  <stop offset="100%" stopColor={n.color} stopOpacity="0"/>
                </radialGradient>
              ))}
            </defs>
            <rect width={dims.w} height={dims.h} fill="url(#bgGrad)"/>

            {/* Connection lines */}
            {CONNECTIONS.map((conn, ci) => {
              const from = NODES.find(n => n.id === conn.from)
              const to = NODES.find(n => n.id === conn.to)
              if (!from || !to) return null
              const x1 = px(from.x), y1 = py(from.y)
              const x2 = px(to.x),   y2 = py(to.y)
              const isSelected = selected && (conn.from === selected || conn.to === selected)
              const isHovered = hoveredConnection === ci
              const opacity = selected ? (isSelected ? 0.7 : 0.08) : connOpacity(conn.from)
              const strokeW = isSelected || isHovered ? 1.5 : 0.8
              // Midpoint for flow dot
              const fo = flowOffset(ci)
              const mx = x1 + (x2 - x1) * fo
              const my = y1 + (y2 - y1) * fo

              return (
                <g key={ci} onMouseEnter={() => setHoveredConnection(ci)} onMouseLeave={() => setHoveredConnection(null)}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={from.color} strokeWidth={strokeW} opacity={opacity}
                    strokeDasharray={isSelected ? 'none' : '3 4'}/>
                  {/* Animated flow dot */}
                  {(isSelected || resonance(conn.from) > 0.3) && (
                    <circle cx={mx} cy={my} r={2} fill={from.color} opacity={opacity * 1.5}/>
                  )}
                </g>
              )
            })}

            {/* Glow halos */}
            {NODES.map(n => (
              <circle key={`glow_${n.id}`}
                cx={px(n.x)} cy={py(n.y)}
                r={nodeR(n.id) + 18}
                fill={`url(#glow_${n.id})`}
                opacity={selected === n.id ? 1 : 0.6}/>
            ))}

            {/* Node circles */}
            {NODES.map(n => {
              const r = nodeR(n.id)
              const isActive = selected === n.id
              const dimmed = selected && !isActive
              const res = resonance(n.id)

              return (
                <g key={n.id} onClick={() => setSelected(selected === n.id ? null : n.id)}
                  style={{ cursor: 'pointer' }}>
                  {/* Outer ring showing resonance */}
                  <circle cx={px(n.x)} cy={py(n.y)} r={r + 6}
                    fill="none" stroke={n.color} strokeWidth={1}
                    opacity={dimmed ? 0.15 : 0.25}
                    strokeDasharray={`${(r + 6) * 2 * Math.PI * res} ${(r + 6) * 2 * Math.PI * (1 - res)}`}
                    transform={`rotate(-90 ${px(n.x)} ${py(n.y)})`}/>
                  {/* Main circle */}
                  <circle cx={px(n.x)} cy={py(n.y)} r={r}
                    fill={isActive ? n.color : n.bg}
                    stroke={n.color} strokeWidth={isActive ? 0 : 1.5}
                    opacity={dimmed ? 0.3 : 1}/>
                  {/* Icon */}
                  <text x={px(n.x)} y={py(n.y) - 4} textAnchor="middle"
                    fontSize={n.id === 'd1' ? 18 : 15}
                    fill={isActive ? '#fff' : n.color}
                    opacity={dimmed ? 0.4 : 1}
                    style={{ userSelect: 'none' }}>
                    {n.icon}
                  </text>
                  {/* Name */}
                  <text x={px(n.x)} y={py(n.y) + 12} textAnchor="middle"
                    fontSize={10} fontWeight={700}
                    fill={isActive ? '#fff' : n.text}
                    opacity={dimmed ? 0.4 : 1}
                    style={{ userSelect: 'none' }}>
                    {n.name}
                  </text>
                  {/* Resonance % */}
                  <text x={px(n.x)} y={py(n.y) + 23} textAnchor="middle"
                    fontSize={8}
                    fill={isActive ? 'rgba(255,255,255,0.8)' : n.color}
                    opacity={dimmed ? 0.3 : 0.8}
                    style={{ userSelect: 'none' }}>
                    {domainScores?.[n.id] || 0}%
                  </text>
                </g>
              )
            })}

            {/* Center coherence label */}
            {!selected && (
              <>
                <text x={dims.w/2} y={dims.h/2 - 8} textAnchor="middle" fontSize={11} fill="#888" fontWeight={500}>Coherence field</text>
                <text x={dims.w/2} y={dims.h/2 + 8} textAnchor="middle" fontSize={9} fill="#C0BEBA">tap any body to explore</text>
              </>
            )}
          </svg>

          {/* Legend */}
          <div style={{ padding: '10px 16px', borderTop: bdr, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 10, color: '#888', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 20, height: 1, borderTop: '1px dashed #888' }}/> energy flow
            </div>
            <div style={{ fontSize: 10, color: '#888', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width={14} height={14}><circle cx={7} cy={7} r={5} fill="none" stroke="#7F77DD" strokeWidth={1} strokeDasharray="8 4" transform="rotate(-90 7 7)"/></svg> resonance ring
            </div>
            <div style={{ fontSize: 10, color: '#888' }}>Node size = current resonance level</div>
          </div>
        </div>

        {/* ── Detail panel ── */}
        {selectedNode && (
          <div style={{ background: selectedNode.bg, borderRadius: 14, border: `1.5px solid ${selectedNode.color}30`, padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: selectedNode.color, marginBottom: 4 }}>{selectedNode.role}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: selectedNode.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{selectedNode.icon}</span> {selectedNode.name}
                  <span style={{ fontSize: 14, fontWeight: 600, color: selectedNode.color }}>
                    {domainScores?.[selectedNode.id] || 0}%
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: selectedNode.color, opacity: 0.6 }}>×</button>
            </div>

            <div style={{ fontSize: 13, color: selectedNode.text, lineHeight: 1.7, marginBottom: 16, opacity: 0.9 }}>
              {selectedNode.desc}
            </div>

            {/* What it feeds */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: selectedNode.color, marginBottom: 8 }}>
                When resonant, it lifts
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selectedNode.feeds.map(id => {
                  const n = NODES.find(x => x.id === id)
                  return (
                    <div key={id} onClick={() => setSelected(id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.5)', cursor: 'pointer', border: `0.5px solid ${n.color}40` }}>
                      <span style={{ fontSize: 12 }}>{n.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: n.text }}>{n.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Depleted by */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: selectedNode.color, marginBottom: 8 }}>
                Interference sources
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {selectedNode.depleted_by.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: selectedNode.color, flexShrink: 0, opacity: 0.6 }}/>
                    <div style={{ fontSize: 12, color: selectedNode.text, opacity: 0.85 }}>{d}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cascade */}
            <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: selectedNode.color, marginBottom: 6 }}>
                When out of resonance
              </div>
              <div style={{ fontSize: 12, color: selectedNode.text, lineHeight: 1.65, opacity: 0.9 }}>{selectedNode.cascade}</div>
            </div>

            {/* Top practices */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: selectedNode.color, marginBottom: 8 }}>
                Primary tuning practices
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedNode.top_practices.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: selectedNode.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{i+1}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: selectedNode.text }}>{p}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Cascade chain explainer ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: bdr, padding: '20px 22px', marginTop: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>The cascade chain</div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
          The five bodies are not independent — they form a living system. Disruption in one body cascades through the others in predictable patterns.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0 }}>
          {[
            { label: 'Form collapses', consequence: '→ Field destabilizes', color: '#1D9E75' },
            { label: 'Field holds charge', consequence: '→ Mind distorts', color: '#BA7517' },
            { label: 'Mind becomes reactive', consequence: '→ Code runs unchecked', color: '#378ADD' },
            { label: 'Code activates patterns', consequence: '→ Source dims', color: '#D85A30' },
            { label: 'Source dims', consequence: '→ all bodies lose their anchor', color: '#7F77DD' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '12px 10px', borderLeft: i > 0 ? bdr : 'none', textAlign: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, margin: '0 auto 8px' }}/>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a18', marginBottom: 4, lineHeight: 1.4 }}>{item.label}</div>
              <div style={{ fontSize: 10, color: '#888', lineHeight: 1.4 }}>{item.consequence}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, padding: '12px 16px', background: '#EEEDFE', borderRadius: 10, borderLeft: '3px solid #7F77DD' }}>
          <div style={{ fontSize: 12, color: '#3C3489', lineHeight: 1.7 }}>
            <strong>The reverse is equally true.</strong> When Source resonates clearly, it stabilizes all four bodies simultaneously. This is why Source practices are weighted highest in your coherence score — they are the highest-leverage intervention in the entire system.
          </div>
        </div>
      </div>
    </div>
  )
}
