<script setup>
defineProps({
  exercise: Object,
})
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full gap-6">
    <!-- Rep square or Time circle -->
    <div v-if="exercise?.reps">
      <span class="inline-flex items-center justify-center w-32 h-32 bg-gymOrange rounded-2xl text-7xl font-black text-white font-condensed">
        {{ exercise.reps }}
      </span>
    </div>
    <div v-else-if="exercise?.timeSeconds">
      <span class="inline-flex items-center justify-center w-32 h-32 border-4 border-gymOrange rounded-full text-6xl font-black text-gymOrange font-condensed">
        {{ exercise.timeSeconds }}s
      </span>
    </div>

    <!-- Exercise name -->
    <h2 class="text-7xl font-black text-white uppercase tracking-tighter font-condensed text-center">
      {{ exercise?.name }}
    </h2>

    <!-- Weight -->
    <p v-if="exercise?.weight" class="text-4xl text-white/50 font-condensed uppercase">
      {{ exercise.weight }}
    </p>
  </div>
</template>
