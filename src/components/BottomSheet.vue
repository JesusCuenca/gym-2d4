<script setup>
import { watch, onUnmounted } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  open: Boolean,
  title: String,
})

const emit = defineEmits(['close'])

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) document.addEventListener('keydown', onKeydown)
    else document.removeEventListener('keydown', onKeydown)
  },
)

onUnmounted(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="bottom-sheet">
      <div
        v-if="open"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        @click.self="emit('close')"
      >
        <div class="bottom-sheet-panel absolute bottom-0 left-0 right-0 max-w-5xl mx-auto bg-[#111] border-t border-white/10 rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <!-- Handle -->
          <div class="flex justify-center pt-3 pb-1">
            <div class="w-10 h-1 bg-white/20 rounded-full" />
          </div>

          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <h2 class="text-white font-bold text-lg">{{ title }}</h2>
            <button @click="emit('close')" class="text-white/50 hover:text-white p-1 transition-colors">
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <!-- Content -->
          <div class="p-5">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
