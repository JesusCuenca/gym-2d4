<script setup>
defineProps({
  exercises: Array,
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-for="(exercise, index) in exercises"
      :key="index"
      class="flex items-center gap-5"
    >
      <!-- Rep square or Time circle -->
      <div v-if="exercise.reps" class="flex-shrink-0">
        <span class="inline-flex items-center justify-center w-20 h-20 bg-gymOrange rounded-xl text-4xl font-black text-white font-condensed">
          {{ exercise.reps }}
        </span>
      </div>
      <div v-else-if="exercise.timeSeconds" class="flex-shrink-0">
        <span class="inline-flex items-center justify-center w-20 h-20 border-4 border-gymOrange rounded-full text-3xl font-black text-gymOrange font-condensed">
          {{ exercise.timeSeconds }}s
        </span>
      </div>

      <!-- Exercise name and details -->
      <div class="flex-1 min-w-0">
        <p class="text-4xl font-black text-white uppercase tracking-normal font-condensed truncate">
          {{ exercise.name }}
        </p>
        <p v-if="exercise.weight" class="text-2xl text-white/50 font-condensed uppercase">
          {{ exercise.weight }}
        </p>
      </div>
    </div>
  </div>
</template>
