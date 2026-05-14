/**
 * src/shared/dateUtils.js
 *
 * Shared date utilities used by both todayEngine and patternLearningModel.
 * Extracted here to prevent circular dependency between those two modules.
 */

export function getDateKey(date = new Date()) {
  return date.toDateString()
}

export function getPreviousDateKey(date = new Date(), daysBack = 1) {
  const d = new Date(date)
  d.setDate(d.getDate() - daysBack)
  return d.toDateString()
}
