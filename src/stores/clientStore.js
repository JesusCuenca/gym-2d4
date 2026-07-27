import { defineStore } from 'pinia'
import { db } from '../firebase'
import { collection, getDocs, writeBatch } from 'firebase/firestore'
import { useFirestoreCrud } from '../composables/useFirestoreCrud'
import { validateClient } from '../utils/validation'

// NOTE: the client's auto-generated doc ID is also the private-link token
// (/progreso/:clientId). A leaked link can only be revoked by deleting and
// re-creating the client.
export const useClientStore = defineStore('clients', () => {
  const crud = useFirestoreCrud('clients', {
    validateFn: validateClient,
    labels: { item: 'cliente', items: 'clientes' },
  })

  // Cascade delete: measurements first, client doc last, so a partial
  // failure leaves a retryable state (orphan measurements are harmless).
  async function deleteClient(id) {
    crud.error.value = null
    try {
      const snapshot = await getDocs(collection(db, 'clients', id, 'measurements'))
      for (let i = 0; i < snapshot.docs.length; i += 500) {
        const batch = writeBatch(db)
        snapshot.docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref))
        await batch.commit()
      }
    } catch (e) {
      crud.error.value = 'No se pudo eliminar el cliente. Intenta de nuevo.'
      console.error('deleteClient(measurements) error:', e)
      throw e
    }
    await crud.remove(id)
  }

  return {
    clients: crud.items,
    loading: crud.loading,
    error: crud.error,
    $reset: crud.$reset,
    fetchClients: crud.fetchOwn,
    fetchAllClients: crud.fetchAll,
    getClient: crud.getById,
    createClient: crud.create,
    updateClient: crud.update,
    deleteClient,
  }
})
