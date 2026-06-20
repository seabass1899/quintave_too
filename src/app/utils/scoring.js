export function safePercent(numerator, denominator) {
  if (!denominator) return 0
  return Math.round((numerator / denominator) * 100)
}

export function calculateCoherenceScore(domainScores = {}) {
  // Inputs d1..d5 are each on a 0–10 scale. Source (d1) weighted 1.5×;
  // total weight = 5.5. Output expressed on the 0–100 scale.
  const sourceWeighted = (domainScores.d1 || 0) * 1.5
  const otherDomains = ['d2', 'd3', 'd4', 'd5'].reduce((sum, id) => sum + (domainScores[id] || 0), 0)
  return Math.round(((sourceWeighted + otherDomains) / 5.5) * 10)
}

export function normalizeScore(value, fallback = 0) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return fallback
  return Math.max(0, Math.min(100, Math.round(numeric)))
}
