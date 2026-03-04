<script setup>
import { computed } from 'vue'
import { formatTimer } from '../../utils/time'

const props = defineProps({
  session: Object,
})

const totalTime = computed(() => {
  const seconds = props.session?.accumulatedTime || 0
  return formatTimer(seconds)
})

const blocksCompleted = computed(() => props.session?.blocks?.length || 0)

const className = computed(() => props.session?.className || '')

const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  delay: `${Math.random() * 2}s`,
  duration: `${2 + Math.random() * 2}s`,
  color: ['#FB6537', '#06B6D4', '#EF4444', '#22C55E', '#FACC15', '#A855F7'][i % 6],
  size: `${6 + Math.random() * 8}px`,
}))
</script>

<template>
  <div class="flex items-center justify-center h-full relative overflow-hidden">
    <!-- CSS Confetti -->
    <div
      v-for="piece in confettiPieces"
      :key="piece.id"
      class="absolute top-0 rounded-sm pointer-events-none"
      :style="{
        left: piece.left,
        width: piece.size,
        height: piece.size,
        backgroundColor: piece.color,
        animation: `confetti-fall ${piece.duration} ${piece.delay} ease-in forwards`,
      }"
    />

    <!-- Content -->
    <div class="text-center z-10">
      <p v-if="className" class="text-tv-label-lg text-white/60 uppercase tracking-wider font-condensed mb-6">
        {{ className }}
      </p>
      <h1 class="text-tv-heading font-black text-gymOrange uppercase tracking-normal font-condensed mb-4 animate-celebration-pulse">
        CLASE FINALIZADA
      </h1>
      <p class="text-tv-body text-white/70 uppercase tracking-wider font-condensed mb-12">
        ¡Buen trabajo!
      </p>

      <!-- Stats row -->
      <div class="flex justify-center gap-8">
        <div class="bg-white/10 rounded-2xl px-8 py-5 text-center">
          <p class="text-sm text-white/60 uppercase tracking-wider font-condensed mb-1">Tiempo total</p>
          <p class="text-tv-emphasis font-black text-gymOrange font-condensed tabular-nums">{{ totalTime }}</p>
        </div>
        <div class="bg-white/10 rounded-2xl px-8 py-5 text-center">
          <p class="text-sm text-white/60 uppercase tracking-wider font-condensed mb-1">Bloques</p>
          <p class="text-tv-emphasis font-black text-gymOrange font-condensed tabular-nums">{{ blocksCompleted }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
