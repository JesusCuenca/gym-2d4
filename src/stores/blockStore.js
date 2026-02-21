import { defineStore } from 'pinia'
import { useFirestoreCrud } from '../composables/useFirestoreCrud'
import { validateBlock } from '../utils/validation'

export const useBlockStore = defineStore('blocks', () => {
  const crud = useFirestoreCrud('blocks', {
    validateFn: validateBlock,
    labels: { item: 'bloque', items: 'bloques' },
  })
  return {
    blocks: crud.items,
    loading: crud.loading,
    error: crud.error,
    $reset: crud.$reset,
    fetchBlocks: crud.fetchOwn,
    fetchAllBlocks: crud.fetchAll,
    getBlock: crud.getById,
    createBlock: crud.create,
    updateBlock: crud.update,
    deleteBlock: crud.remove,
  }
})
