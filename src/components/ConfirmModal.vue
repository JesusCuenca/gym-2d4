<script setup>
import { useConfirm } from '../composables/useConfirm'

const { state, respond } = useConfirm()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="state.open"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4"
        @click.self="respond(false)"
      >
        <div class="bg-[#111] border border-white/15 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <h3 class="text-white font-bold text-lg mb-2">{{ state.title }}</h3>
          <p class="text-white/70 text-sm mb-6">{{ state.message }}</p>
          <div class="flex gap-3 justify-end">
            <button
              class="px-4 py-2 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 text-sm transition-colors"
              @click="respond(false)"
            >
              Cancelar
            </button>
            <button
              :class="[state.confirmClass, 'px-4 py-2 rounded-lg text-sm font-medium transition-colors']"
              @click="respond(true)"
            >
              {{ state.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
