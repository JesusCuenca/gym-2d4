<script setup>
import { computed } from 'vue'
import TvTimerCountdown from './TvTimerCountdown.vue'
import TvExerciseList from './TvExerciseList.vue'
import TvSingleExercise from './TvSingleExercise.vue'
import TvInfoPill from './TvInfoPill.vue'

const props = defineProps({
  block: Object,
  displaySeconds: Number,
  session: Object,
})

const isEmom = computed(() => props.block?.type === 'emom')

// For EMOM: determine which exercise to show based on elapsed time and interval
const currentEmomExercise = computed(() => {
  if (!isEmom.value || !props.block?.exercises?.length) return null
  const interval = props.block.intervalSeconds || 60
  const currentRound = Math.floor(props.displaySeconds / interval)
  const exerciseIndex = currentRound % props.block.exercises.length
  return props.block.exercises[exerciseIndex]
})

const emomRound = computed(() => {
  if (!isEmom.value) return 0
  const interval = props.block.intervalSeconds || 60
  return Math.floor(props.displaySeconds / interval) + 1
})

// Next exercise for the info pill
const nextExercise = computed(() => {
  if (!props.block?.exercises?.length) return null
  if (isEmom.value) {
    const interval = props.block.intervalSeconds || 60
    const currentRound = Math.floor(props.displaySeconds / interval)
    const nextIndex = (currentRound + 1) % props.block.exercises.length
    return props.block.exercises[nextIndex]
  }
  return null
})
</script>

<template>
  <div class="flex h-full relative">
    <!-- Left Panel (30%) — Timer & Block Info -->
    <div class="w-[30%] flex flex-col items-center justify-center border-r border-white/10 px-6">
      <TvTimerCountdown
        :timeCapSeconds="block.timeCapSeconds"
        :displaySeconds="displaySeconds"
      />
      <p class="text-3xl font-black text-white/60 uppercase tracking-normal font-condensed mt-6">
        {{ block.name }}
      </p>
      <p v-if="isEmom" class="text-2xl text-gymOrange font-bold font-condensed mt-2">
        RONDA {{ emomRound }}<span v-if="block.rounds">/{{ block.rounds }}</span>
      </p>
    </div>

    <!-- Right Panel (70%) — Exercises -->
    <div class="w-[70%] flex items-center justify-center px-12">
      <!-- EMOM: Single exercise, colossal -->
      <TvSingleExercise
        v-if="isEmom && currentEmomExercise"
        :exercise="currentEmomExercise"
      />
      <!-- AMRAP / Other: Full exercise list -->
      <TvExerciseList
        v-else
        :exercises="block.exercises"
      />
    </div>

    <!-- Info Pill -->
    <TvInfoPill
      v-if="nextExercise"
      label="Siguiente"
      :value="nextExercise.name"
    />
  </div>
</template>
