export function safePercent(numerator, denominator) {
  if (!denominator) return 0
  return Math.round((numerator / denominator) * 100)
}

export function calculateCoherenceScore(domainScores = {}) {
  const sourceWeighted = (domainScores.d1 || 0) * 1.5
  const otherDomains = ['d2', 'd3', 'd4', 'd5'].reduce((sum, id) => sum + (domainScores[id] || 0), 0)
  return Math.round((sourceWeighted + otherDomains) / 6.5)
}

export function normalizeScore(value, fallback = 0) {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return fallback
  return Math.max(0, Math.min(100, Math.round(numeric)))
}
