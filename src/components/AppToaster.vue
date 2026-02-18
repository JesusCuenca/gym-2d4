<script setup>
import { useToastStore } from '../stores/toastStore'
import { XMarkIcon } from '@heroicons/vue/20/solid'

const toastStore = useToastStore()

const borderColor = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
}
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        :class="[
          'flex items-center gap-3 bg-white/10 border border-white/20 border-l-4 backdrop-blur rounded-xl px-4 py-3 shadow-lg',
          borderColor[toast.type] || borderColor.success,
        ]"
      >
        <span class="text-white text-sm flex-1">{{ toast.message }}</span>
        <button
          class="text-white/40 hover:text-white/70 transition-colors shrink-0"
          @click="toastStore.dismiss(toast.id)"
        >
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
