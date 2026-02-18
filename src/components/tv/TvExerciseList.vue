<script setup>
defineProps({
  exercises: Array,
  showRepBadges: {
    type: Boolean,
    default: true,
  },
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-for="(exercise, index) in exercises"
      :key="index"
      class="flex items-center gap-5"
    >
      <!-- Rep badge -->
      <div v-if="showRepBadges && exercise.repsEveryRound" class="flex-shrink-0">
        <span class="inline-flex items-center justify-center w-20 h-20 bg-gymOrange rounded-xl text-4xl font-black text-white font-condensed">
          {{ exercise.repsEveryRound }}
        </span>
      </div>

      <!-- Exercise name and notes -->
      <div class="flex-1 min-w-0">
        <p class="text-4xl font-black text-white uppercase tracking-normal font-condensed truncate">
          {{ exercise.name }}
        </p>
        <p v-if="exercise.notes" class="text-2xl text-white/50 font-condensed uppercase">
          {{ exercise.notes }}
        </p>
      </div>
    </div>
  </div>
</template>
