<script setup>
defineProps({
  exercise: Object,
})
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full gap-6 overflow-hidden">
    <!-- Rep badge -->
    <div v-if="exercise?.repsEveryRound">
      <span
        class="inline-flex items-center justify-center w-32 h-32 bg-gymOrange rounded-2xl text-7xl font-black text-white font-condensed">
        {{ exercise.repsEveryRound }}
      </span>
    </div>

    <!-- Exercise name -->
    <h2
      class="text-[clamp(4rem,10vw,8rem)] font-black text-white uppercase tracking-normal font-condensed text-center max-w-full break-words leading-none">
      {{ exercise?.name }}
    </h2>

    <!-- Notes -->
    <p v-if="exercise?.notes" class="text-tv-body text-white/70 font-condensed uppercase">
      {{ exercise.notes }}
    </p>
  </div>
</template>
