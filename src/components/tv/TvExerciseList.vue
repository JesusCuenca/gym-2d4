<script setup>
import { computed } from 'vue'

const props = defineProps({
  exercises: Array,
  showRepBadges: {
    type: Boolean,
    default: true,
  },
})

const sizeTier = computed(() => {
  const count = props.exercises?.length || 0
  if (count <= 2) return 'xl'
  if (count <= 4) return 'lg'
  if (count <= 6) return 'md'
  if (count <= 8) return 'sm'
  return 'xs'
})

const tierClasses = computed(() => {
  const tiers = {
    xl: { gap: 'gap-8', name: 'text-8xl', notes: 'text-4xl', badge: 'w-28 h-28 text-6xl rounded-2xl', itemGap: 'gap-6' },
    lg: { gap: 'gap-6', name: 'text-7xl', notes: 'text-3xl', badge: 'w-24 h-24 text-5xl rounded-2xl', itemGap: 'gap-5' },
    md: { gap: 'gap-5', name: 'text-6xl', notes: 'text-2xl', badge: 'w-20 h-20 text-4xl rounded-xl', itemGap: 'gap-5' },
    sm: { gap: 'gap-4', name: 'text-5xl', notes: 'text-xl', badge: 'w-18 h-18 text-3xl rounded-xl', itemGap: 'gap-4' },
    xs: { gap: 'gap-3', name: 'text-4xl', notes: 'text-lg', badge: 'w-16 h-16 text-3xl rounded-xl', itemGap: 'gap-4' },
  }
  return tiers[sizeTier.value]
})
</script>

<template>
  <div class="flex flex-col" :class="tierClasses.gap">
    <div
      v-for="(exercise, index) in exercises"
      :key="index"
      class="flex items-center"
      :class="tierClasses.itemGap"
    >
      <!-- Rep badge -->
      <div v-if="showRepBadges && exercise.repsEveryRound" class="flex-shrink-0">
        <span
          class="inline-flex items-center justify-center bg-gymOrange font-black text-white font-condensed"
          :class="tierClasses.badge"
        >
          {{ exercise.repsEveryRound }}
        </span>
      </div>

      <!-- Exercise name and notes -->
      <div class="flex-1 min-w-0">
        <p
          class="font-black text-white uppercase tracking-normal font-condensed truncate"
          :class="tierClasses.name"
        >
          {{ exercise.name }}
        </p>
        <p
          v-if="exercise.notes"
          class="text-white/70 font-condensed uppercase"
          :class="tierClasses.notes"
        >
          {{ exercise.notes }}
        </p>
      </div>
    </div>
  </div>
</template>
