import { defineStore } from 'pinia'
import { useFirestoreCrud } from '../composables/useFirestoreCrud'
import { validateClass } from '../utils/validation'

export const useClassStore = defineStore('classes', () => {
  const crud = useFirestoreCrud('classes', {
    validateFn: validateClass,
    labels: { item: 'clase', items: 'clases' },
  })
  return {
    classes: crud.items,
    loading: crud.loading,
    error: crud.error,
    $reset: crud.$reset,
    fetchClasses: crud.fetchOwn,
    fetchAllClasses: crud.fetchAll,
    getClassById: crud.getById,
    createClass: crud.create,
    updateClass: crud.update,
    deleteClass: crud.remove,
  }
})
