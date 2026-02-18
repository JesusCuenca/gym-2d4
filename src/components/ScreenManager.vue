<script setup>
import { ref } from 'vue'
import { useScreenStore } from '../stores/screenStore'
import { useToastStore } from '../stores/toastStore'
import { useConfirm } from '../composables/useConfirm'
import { TrashIcon } from '@heroicons/vue/24/outline'

const screenStore = useScreenStore()
const toastStore = useToastStore()
const { confirm } = useConfirm()
const newScreenName = ref('')
const adding = ref(false)

async function handleAdd() {
  if (!newScreenName.value.trim()) return
  adding.value = true
  try {
    await screenStore.createScreen(newScreenName.value.trim())
    newScreenName.value = ''
    await screenStore.fetchScreens()
    toastStore.show('Pantalla creada')
  } finally {
    adding.value = false
  }
}

async function handleDelete(screen) {
  const ok = await confirm({
    title: 'Eliminar pantalla',
    message: `"${screen.name}" será eliminada permanentemente.`,
  })
  if (ok) {
    await screenStore.deleteScreen(screen.id)
    toastStore.show('Pantalla eliminada')
  }
}
</script>

<template>
  <div>
    <!-- Add screen form -->
    <div class="flex gap-2 mb-4">
      <input
        v-model="newScreenName"
        type="text"
        placeholder="Nombre de la pantalla (ej. Sala 1)"
        @keyup.enter="handleAdd"
        class="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-gymOrange"
      />
      <button
        @click="handleAdd"
        :disabled="adding || !newScreenName.trim()"
        class="bg-gymOrange text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-gymOrange/90 disabled:opacity-50 transition-colors"
      >
        + Añadir
      </button>
    </div>

    <!-- Screens list -->
    <div v-if="screenStore.screens.length === 0" class="text-white/30 text-sm text-center py-4 border border-dashed border-white/10 rounded-lg">
      No hay pantallas todavía. Añade una pantalla por cada TV de tu gimnasio.
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="screen in screenStore.screens"
        :key="screen.id"
        class="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-3"
      >
        <div>
          <span class="text-white font-medium text-sm">{{ screen.name }}</span>
          <span class="text-white/30 text-xs ml-2">/tv/{{ screen.id }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-if="screen.activeSessionId"
            class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400"
          >
            En vivo
          </span>
          <button
            @click="handleDelete(screen)"
            class="text-red-400/70 hover:text-red-400 p-1.5 transition-colors"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
