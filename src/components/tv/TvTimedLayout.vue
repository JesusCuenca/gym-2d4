<script setup>
import { computed } from 'vue'
import { formatTimer } from '../../utils/time'
import TvTimerCountdown from './TvTimerCountdown.vue'
import TvExerciseList from './TvExerciseList.vue'
import TvSingleExercise from './TvSingleExercise.vue'
import TvInfoPill from './TvInfoPill.vue'
import TvProgressBar from './TvProgressBar.vue'

const props = defineProps({
  block: Object,
  timer: Object,
  session: Object,
})

const showRoundInfo = computed(() => props.timer.totalRounds > 1)

const roundInfoText = computed(() => {
  if (showRoundInfo.value) {
    return `RONDA ${props.timer.currentRound} / ${props.timer.totalRounds}`
  }
  // Single round (e.g. AMRAP): show total time
  return formatTimer(props.block.workSeconds)
})

const currentExercise = computed(() => {
  const idx = props.timer.currentExerciseIndex
  if (idx == null) return null
  return props.block.exercises?.[idx] ?? null
})

const isRotating = computed(() => props.timer.currentExerciseIndex != null)
const isResting = computed(() => props.timer.isResting)

const exercisePositionText = computed(() => {
  const idx = props.timer.currentExerciseIndex
  if (idx == null) return null
  return `EJERCICIO ${idx + 1} / ${props.block.exercises?.length || 0}`
})
</script>

<template>
  <div class="flex h-full relative">
    <TvProgressBar :block="block" :timer="timer" :blockIndex="session.currentBlockIndex"
      :totalBlocks="session.blocks?.length || 0" />

    <!-- Left Panel (30%) — Timer & Block Info -->
    <div class="w-[30%] flex flex-col items-center border-r border-white/10 px-6">
      <!-- Top: block name -->
      <p class="pt-10 text-3xl font-black text-white/60 uppercase tracking-normal font-condensed">
        {{ block.name }}
      </p>

      <!-- Center: timer countdown -->
      <div class="flex-1 flex items-center justify-center">
        <TvTimerCountdown :secondsLeft="timer.phaseSecondsLeft" :isResting="isResting" />
      </div>

      <!-- Bottom: round info -->
      <p class="pb-10 text-3xl font-black uppercase tracking-normal font-condensed"
        :class="showRoundInfo ? 'text-gymOrange' : 'text-white/60'">
        {{ roundInfoText }}
      </p>
    </div>

    <!-- Right Panel (70%) — Exercises -->
    <div class="w-[70%] flex items-center justify-center px-12 relative">
      <!-- Rotating mode: single exercise with transitions -->
      <template v-if="isRotating">
        <Transition name="tv-exercise" mode="out-in">
          <div v-if="!isResting" :key="`ex-${timer.currentExerciseIndex}`"
            class="relative flex flex-col items-center justify-center h-full">
            <p v-if="exercisePositionText"
              class="absolute top-10 text-2xl text-white/60 uppercase tracking-widest font-condensed">
              {{ exercisePositionText }}
            </p>
            <TvSingleExercise :exercise="currentExercise" />
          </div>
          <div v-else key="rest" class="flex items-center justify-center h-full">
            <span class="text-8xl font-black text-gymRest uppercase font-condensed">DESCANSO</span>
          </div>
        </Transition>
      </template>

      <!-- List mode: full exercise list -->
      <template v-else>
        <TvExerciseList :exercises="block.exercises" />
        <!-- Rest overlay for list mode with transition -->
        <Transition name="tv-rest">
          <div v-if="isResting" class="absolute inset-0 flex items-center justify-center bg-gymBlack/80">
            <span class="text-8xl font-black text-gymRest uppercase font-condensed">DESCANSO</span>
          </div>
        </Transition>
      </template>
    </div>

    <!-- Info Pill — next exercise (rotating mode only) -->
    <TvInfoPill v-if="timer.nextExerciseName" label="Siguiente" :value="timer.nextExerciseName" />
  </div>
</template>
