<script setup>
defineProps({
  exercise: Object,
})
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full gap-6">
    <!-- Rep badge -->
    <div v-if="exercise?.repsEveryRound">
      <span class="inline-flex items-center justify-center w-32 h-32 bg-gymOrange rounded-2xl text-7xl font-black text-white font-condensed">
        {{ exercise.repsEveryRound }}
      </span>
    </div>

    <!-- Exercise name -->
    <h2 class="text-7xl font-black text-white uppercase tracking-normal font-condensed text-center">
      {{ exercise?.name }}
    </h2>

    <!-- Notes -->
    <p v-if="exercise?.notes" class="text-4xl text-white/50 font-condensed uppercase">
      {{ exercise.notes }}
    </p>
  </div>
</template>
