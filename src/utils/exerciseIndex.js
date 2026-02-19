import musclesHierarchy from './musclesHierarchy.json'
import exercisesData from './exercises.json'

export const parentGroups = musclesHierarchy
export const exercises = exercisesData

// parentId → Set of child names
const parentChildNames = Object.fromEntries(
  parentGroups.map((g) => [g.id, new Set(g.children.map((c) => c.name))]),
)

/**
 * Filter exercises by text query and/or muscle hierarchy.
 *
 * @param {string} query - substring search against name and displayName
 * @param {string|null} parentId - filter by parent group id (e.g. 'pierna')
 * @param {string|null} childName - filter by specific child muscle name (e.g. 'Cuádriceps')
 * @returns {Array} filtered and sorted exercises
 */
export function filterExercises(query, parentId, childName) {
  let result = exercises

  if (childName) {
    result = result.filter(
      (ex) =>
        ex.musculoPrincipal === childName ||
        ex.musculosSecundarios?.includes(childName),
    )
  } else if (parentId) {
    const childSet = parentChildNames[parentId]
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
  if (childName) {
    result = [...result].sort((a, b) =>
      (a.musculoPrincipal === childName ? 0 : 1) - (b.musculoPrincipal === childName ? 0 : 1),
    )
  } else if (parentId) {
    const childSet = parentChildNames[parentId]
    if (childSet) {
      result = [...result].sort((a, b) =>
        (childSet.has(a.musculoPrincipal) ? 0 : 1) - (childSet.has(b.musculoPrincipal) ? 0 : 1),
      )
    }
  }

  return result
}
