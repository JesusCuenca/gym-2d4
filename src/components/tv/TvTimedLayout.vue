<script setup>
import { computed } from 'vue'
import { formatTimer } from '../../utils/time'
import TvTimerCountdown from './TvTimerCountdown.vue'
import TvExerciseList from './TvExerciseList.vue'
import TvSingleExercise from './TvSingleExercise.vue'
import TvInfoPill from './TvInfoPill.vue'

const props = defineProps({
  block: Object,
  timer: Object,
  session: Object,
})

const showRoundInfo = computed(() => props.timer.totalRounds.value > 1)

const roundInfoText = computed(() => {
  if (showRoundInfo.value) {
    return `RONDA ${props.timer.currentRound.value} / ${props.timer.totalRounds.value}`
  }
  // Single round (e.g. AMRAP): show total time
  return formatTimer(props.block.workSeconds)
})

const currentExercise = computed(() => {
  const idx = props.timer.currentExerciseIndex.value
  if (idx == null) return null
  return props.block.exercises?.[idx] ?? null
})

const isRotating = computed(() => props.timer.currentExerciseIndex.value != null)
const isResting = computed(() => props.timer.isResting.value)
</script>

<template>
  <div class="flex h-full relative">
    <!-- Left Panel (30%) — Timer & Block Info -->
    <div class="w-[30%] flex flex-col items-center justify-center border-r border-white/10 px-6">
      <!-- Round info -->
      <p
        class="text-3xl font-black uppercase tracking-normal font-condensed mb-4"
        :class="showRoundInfo ? 'text-gymOrange' : 'text-white/60'"
      >
        {{ roundInfoText }}
      </p>

      <!-- Timer countdown -->
      <TvTimerCountdown
        :secondsLeft="timer.phaseSecondsLeft.value"
        :isResting="isResting"
      />

      <!-- Block name -->
      <p class="text-3xl font-black text-white/60 uppercase tracking-normal font-condensed mt-6">
        {{ block.name }}
      </p>
    </div>

    <!-- Right Panel (70%) — Exercises -->
    <div class="w-[70%] flex items-center justify-center px-12 relative">
      <!-- Rotating mode: single exercise -->
      <template v-if="isRotating">
        <TvSingleExercise
          v-if="!isResting"
          :exercise="currentExercise"
        />
        <div v-else class="flex items-center justify-center h-full">
          <span class="text-8xl font-black text-gymRest uppercase font-condensed">DESCANSO</span>
        </div>
      </template>

      <!-- List mode: full exercise list -->
      <template v-else>
        <TvExerciseList :exercises="block.exercises" />
        <!-- Rest overlay for list mode (e.g. EMOM with rest) -->
        <div
          v-if="isResting"
          class="absolute inset-0 flex items-center justify-center bg-gymBlack/80"
        >
          <span class="text-8xl font-black text-gymRest uppercase font-condensed">DESCANSO</span>
        </div>
      </template>
    </div>

    <!-- Info Pill — next exercise (rotating mode only) -->
    <TvInfoPill
      v-if="timer.nextExerciseName.value"
      label="Siguiente"
      :value="timer.nextExerciseName.value"
    />
  </div>
</template>
