<script setup>
import { computed } from 'vue'
import { getBlockLabel, isTimed } from '../../models/blockTypes'
import { getTotalDuration } from '../../utils/timeline'
import { formatTimer } from '../../utils/time'

const props = defineProps({
  block: Object,
  blockIndex: Number,
  totalBlocks: Number,
  countdownNumber: { type: Number, default: null },
})

const typeLabel = computed(() => getBlockLabel(props.block))

const summaryPills = computed(() => {
  const pills = []
  if (isTimed(props.block?.type)) {
    const duration = getTotalDuration(props.block)
    if (duration) pills.push({ label: 'Duración', value: formatTimer(duration) })
  }
  if (props.block?.exercises?.length) {
    pills.push({ label: 'Ejercicios', value: String(props.block.exercises.length) })
  }
  if (props.block?.rounds > 1) {
    pills.push({ label: 'Rondas', value: String(props.block.rounds) })
  }
  return pills
})
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
      <p v-if="typeLabel" class="text-4xl text-white/30 uppercase tracking-wider font-condensed mb-8">
        {{ typeLabel }}
      </p>

      <!-- Block summary pills -->
      <div v-if="summaryPills.length" class="flex justify-center gap-4 mb-10">
        <div
          v-for="pill in summaryPills"
          :key="pill.label"
          class="bg-white/10 rounded-xl px-5 py-3 text-center"
        >
          <p class="text-sm text-white/40 uppercase tracking-wider font-condensed">{{ pill.label }}</p>
          <p class="text-2xl font-black text-white font-condensed">{{ pill.value }}</p>
        </div>
      </div>

      <!-- 3-2-1 Countdown -->
      <div class="h-32 flex items-center justify-center">
        <Transition name="tv-countdown" mode="out-in">
          <span
            v-if="countdownNumber"
            :key="countdownNumber"
            class="text-9xl font-black text-gymOrange font-condensed tabular-nums"
          >
            {{ countdownNumber }}
          </span>
        </Transition>
      </div>
    </div>
  </div>
</template>
