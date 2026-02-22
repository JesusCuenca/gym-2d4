import { ref, computed, watch } from 'vue'
import { getRepsSubcase } from '../models/blockTypes'

const PAGE_SIZE = 20

/**
 * Shared composable for client-side filtering and pagination.
 * Used by AdminBlocksView and AdminClassesView.
 *
 * @param {Object} options
 * @param {import('vue').ComputedRef<Array>} options.items - Raw items from the store
 * @param {import('vue').ComputedRef<string>} options.currentUserUid - Logged-in user uid
 */
export function useListFilters({ items, currentUserUid }) {
  // Filter state
  const searchText = ref('')
  const userMode = ref('mine') // 'mine' | 'all' | 'selected'
  const selectedUserUids = ref([])
  const dateFrom = ref('')
  const dateTo = ref('')
  const typeFilter = ref('')
  const subtypeFilter = ref('')
  const tagsFilter = ref([])

  // Pagination state
  const currentPage = ref(1)

  // Client-side filtered items
  const filteredItems = computed(() => {
    let result = items.value

    // User filter
    if (userMode.value === 'mine') {
      result = result.filter((item) => item.uid === currentUserUid.value)
    } else if (userMode.value === 'selected' && selectedUserUids.value.length > 0) {
      result = result.filter((item) => selectedUserUids.value.includes(item.uid))
    }

    // Type filter
    if (typeFilter.value) {
      result = result.filter((item) => item.type === typeFilter.value)
    }

    // Subtype filter
    if (subtypeFilter.value) {
      result = result.filter((item) => {
        if (item.type === 'reps') return getRepsSubcase(item) === subtypeFilter.value
        // Timed: subtype null means 'custom'
        const itemSubtype = item.subtype || 'custom'
        return itemSubtype === subtypeFilter.value
      })
    }

    // Text search (case-insensitive substring on name)
    if (searchText.value.trim()) {
      const needle = searchText.value.trim().toLowerCase()
      result = result.filter((item) => item.name?.toLowerCase().includes(needle))
    }

    // Tags filter (OR logic: item must have at least one selected tag)
    if (tagsFilter.value.length > 0) {
      result = result.filter((item) =>
        (item.tags || []).some((t) => tagsFilter.value.includes(t))
      )
    }

    // Date range
    if (dateFrom.value) {
      const from = new Date(dateFrom.value)
      from.setHours(0, 0, 0, 0)
      result = result.filter((item) => {
        const created = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt)
        return created >= from
      })
    }
    if (dateTo.value) {
      const to = new Date(dateTo.value)
      to.setHours(23, 59, 59, 999)
      result = result.filter((item) => {
        const created = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt)
        return created <= to
      })
    }

    return result
  })

  // Pagination
  const totalFilteredCount = computed(() => filteredItems.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(totalFilteredCount.value / PAGE_SIZE)))

  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return filteredItems.value.slice(start, start + PAGE_SIZE)
  })

  // Reset page when any filter changes
  watch(
    [searchText, userMode, selectedUserUids, dateFrom, dateTo, typeFilter, subtypeFilter, tagsFilter],
    () => { currentPage.value = 1 },
  )

  function nextPage() {
    if (currentPage.value < totalPages.value) currentPage.value++
  }

  function prevPage() {
    if (currentPage.value > 1) currentPage.value--
  }

  const hasActiveFilters = computed(() => {
    return searchText.value !== ''
      || userMode.value !== 'mine'
      || dateFrom.value !== ''
      || dateTo.value !== ''
      || typeFilter.value !== ''
      || subtypeFilter.value !== ''
      || tagsFilter.value.length > 0
  })

  function clearFilters() {
    searchText.value = ''
    userMode.value = 'mine'
    selectedUserUids.value = []
    dateFrom.value = ''
    dateTo.value = ''
    typeFilter.value = ''
    subtypeFilter.value = ''
    tagsFilter.value = []
    currentPage.value = 1
  }

  return {
    searchText,
    userMode,
    selectedUserUids,
    dateFrom,
    dateTo,
    typeFilter,
    subtypeFilter,
    tagsFilter,
    currentPage,
    totalPages,
    totalFilteredCount,
    paginatedItems,
    filteredItems,
    nextPage,
    prevPage,
    hasActiveFilters,
    clearFilters,
  }
}
