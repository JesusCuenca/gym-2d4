import musclesHierarchy from './musclesHierarchy.json'
import exercisesData from './exercises.json'

export const parentGroups = musclesHierarchy
export const exercises = exercisesData

// id → display name (e.g. 'cuadriceps' → 'Cuádriceps')
export const muscleIdToName = Object.fromEntries(
  parentGroups.flatMap((g) => g.children.map((c) => [c.id, c.name])),
)

// parentId → Set of child ids
const parentChildIds = Object.fromEntries(
  parentGroups.map((g) => [g.id, new Set(g.children.map((c) => c.id))]),
)

/**
 * Filter exercises by text query and/or muscle hierarchy.
 *
 * @param {string} query - substring search against name and displayName
 * @param {string|null} parentId - filter by parent group id (e.g. 'pierna')
 * @param {string|null} childId - filter by specific child muscle id (e.g. 'cuadriceps')
 * @returns {Array} filtered and sorted exercises
 */
export function filterExercises(query, parentId, childId) {
  let result = exercises

  if (childId) {
    result = result.filter(
      (ex) =>
        ex.musculoPrincipal === childId ||
        ex.musculosSecundarios?.includes(childId),
    )
  } else if (parentId) {
    const childSet = parentChildIds[parentId]
    if (childSet) {
      result = result.filter(
        (ex) =>
          childSet.has(ex.musculoPrincipal) ||
          ex.musculosSecundarios?.some((m) => childSet.has(m)),
      )
    }
  }

  if (query?.trim()) {
    const q = query.trim().toLowerCase()
    result = result.filter(
      (ex) => ex.name.toLowerCase().includes(q) || ex.displayName.toLowerCase().includes(q),
    )
  }

  // Primary muscle match first, secondary after
  if (childId) {
    result = [...result].sort((a, b) =>
      (a.musculoPrincipal === childId ? 0 : 1) - (b.musculoPrincipal === childId ? 0 : 1),
    )
  } else if (parentId) {
    const childSet = parentChildIds[parentId]
    if (childSet) {
      result = [...result].sort((a, b) =>
        (childSet.has(a.musculoPrincipal) ? 0 : 1) - (childSet.has(b.musculoPrincipal) ? 0 : 1),
      )
    }
  }

  return result
}
