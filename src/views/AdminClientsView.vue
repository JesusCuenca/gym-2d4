<script setup>
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useClientStore } from '../stores/clientStore'
import { useUserStore } from '../stores/userStore'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toastStore'
import { useConfirm } from '../composables/useConfirm'
import { useListFilters } from '../composables/useListFilters'
import ListFilterBar from '../components/ListFilterBar.vue'
import { PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline'

const clientStore = useClientStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { confirm } = useConfirm()

const {
  searchText, userMode, selectedUserUids, dateFrom, dateTo,
  currentPage, totalPages, totalFilteredCount, paginatedItems,
  nextPage, prevPage, clearFilters, hasActiveFilters,
} = useListFilters({
  items: computed(() => clientStore.clients),
  currentUserUid: computed(() => authStore.user?.uid),
  defaultUserMode: 'all',
})

async function handleDelete(client) {
  const ok = await confirm({
    title: 'Eliminar cliente',
    message: `"${client.name}" y todas sus mediciones serán eliminados permanentemente.`,
  })
  if (!ok) return
  try {
    await clientStore.deleteClient(client.id)
    toastStore.show('Cliente eliminado')
  } catch {
    toastStore.show('Error al eliminar el cliente.', 'error')
  }
}

function isOwner(client) {
  return client.uid === authStore.user?.uid
}

function clientMeta(client) {
  const parts = []
  if (client.email) parts.push(client.email)
  if (client.phone) parts.push(client.phone)
  return parts.join(' · ')
}

onMounted(() => {
  userStore.fetchAllUsers()
  clientStore.fetchAllClients()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gymOrange">Clientes</h1>
      <RouterLink
        :to="{ name: 'admin-client-create' }"
        class="bg-gymOrange text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-gymOrange/90 transition-colors"
      >
        + Nuevo cliente
      </RouterLink>
    </div>

    <!-- Filters & pagination -->
    <ListFilterBar
      v-model:searchText="searchText"
      v-model:userMode="userMode"
      v-model:selectedUserUids="selectedUserUids"
      v-model:dateFrom="dateFrom"
      v-model:dateTo="dateTo"
      :currentPage="currentPage"
      :totalPages="totalPages"
      :totalFilteredCount="totalFilteredCount"
      :allUsers="userStore.allUsers"
      :currentUserUid="authStore.user?.uid"
      :hasActiveFilters="hasActiveFilters"
      @nextPage="nextPage"
      @prevPage="prevPage"
      @clearFilters="clearFilters"
    />

    <!-- Loading -->
    <div v-if="clientStore.loading" class="flex justify-center py-12">
      <AppSpinner size="lg" />
    </div>

    <!-- Empty state: no data at all -->
    <div v-else-if="clientStore.clients.length === 0" class="text-center py-12">
      <p class="text-white/60 mb-4">No hay clientes todavía. Da de alta tu primer cliente.</p>
      <RouterLink
        :to="{ name: 'admin-client-create' }"
        class="inline-block bg-gymOrange text-white font-bold rounded-lg px-6 py-3 hover:bg-gymOrange/90 transition-colors"
      >
        Crear cliente
      </RouterLink>
    </div>

    <!-- Empty state: filters produced no results -->
    <div v-else-if="totalFilteredCount === 0" class="text-center py-12">
      <p class="text-white/60 mb-4">No hay resultados para estos filtros.</p>
      <button @click="clearFilters" class="text-gymOrange text-sm hover:underline">
        Limpiar filtros
      </button>
    </div>

    <!-- Client list -->
    <TransitionGroup
      v-else
      tag="div"
      class="grid gap-4 sm:grid-cols-2"
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-200 ease-in absolute"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
      move-class="transition-all duration-300 ease-out"
    >
      <RouterLink
        v-for="client in paginatedItems"
        :key="client.id"
        :to="{ name: 'admin-client-detail', params: { id: client.id } }"
        class="block bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/30 transition-colors"
      >
        <h3 class="font-bold text-white text-lg mb-1">{{ client.name }}</h3>

        <p v-if="clientMeta(client)" class="text-white/60 text-sm mb-3 truncate">
          {{ clientMeta(client) }}
        </p>

        <div class="text-white/50 text-xs mb-4">
          Creado por {{ userStore.getUserName(client.uid) }}
        </div>

        <div v-if="isOwner(client)" class="flex gap-2">
          <RouterLink
            :to="{ name: 'admin-client-edit', params: { id: client.id } }"
            class="flex items-center gap-1.5 text-sm text-white/60 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
            @click.stop
          >
            <PencilSquareIcon class="w-4 h-4" />
            Editar
          </RouterLink>
          <button
            @click.stop.prevent="handleDelete(client)"
            class="flex items-center gap-1.5 text-sm text-red-400/70 hover:text-red-400 border border-red-400/20 hover:border-red-400/40 rounded-lg px-3 py-1.5 transition-colors"
          >
            <TrashIcon class="w-4 h-4" />
            Eliminar
          </button>
        </div>
      </RouterLink>
    </TransitionGroup>
  </div>
</template>
