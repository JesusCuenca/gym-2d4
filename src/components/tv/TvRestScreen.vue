<script setup>
import { computed } from 'vue'
import { getBlockLabel } from '../../models/blockTypes'

const props = defineProps({
  block: Object,
  blockIndex: Number,
  totalBlocks: Number,
})

const typeLabel = computed(() => getBlockLabel(props.block))
</script>

<template>
  <div class="flex items-center justify-center h-full">
    <div class="text-center">
      <p class="text-3xl text-white/40 uppercase tracking-wider font-condensed mb-6">
        Siguiente — Bloque {{ blockIndex + 1 }}/{{ totalBlocks }}
      </p>
      <h1 class="text-8xl font-black text-gymOrange uppercase tracking-normal font-condensed mb-4">
        {{ block?.name || 'PREPARADOS' }}
      </h1>
      <p v-if="typeLabel" class="text-4xl text-white/30 uppercase tracking-wider font-condensed">
        {{ typeLabel }}
      </p>
    </div>
  </div>
</template>
