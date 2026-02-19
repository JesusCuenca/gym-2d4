<script setup>
import { computed } from 'vue'
import { getRepsSubcase } from '../../models/blockTypes'
import { formatTimer } from '../../utils/time'
import TvExerciseList from './TvExerciseList.vue'
import TvInfoPill from './TvInfoPill.vue'
import TvProgressBar from './TvProgressBar.vue'

const props = defineProps({
  block: Object,
  timer: Object,
  session: Object,
})

const subcase = computed(() => getRepsSubcase(props.block))

const elapsedDisplay = computed(() => formatTimer(props.timer.displaySeconds.value))
</script>

<template>
  <div class="flex h-full relative">
    <TvProgressBar
      :block="block"
      :timer="timer"
      :blockIndex="session.currentBlockIndex"
      :totalBlocks="session.blocks?.length || 0"
    />

    <!-- Left Panel (30%) — Round Info & Reps -->
    <div class="w-[30%] flex flex-col items-center justify-center border-r border-white/10 px-6">
      <!-- Block name -->
      <p class="text-3xl font-black text-white/60 uppercase tracking-normal font-condensed mb-6">
        {{ block.name }}
      </p>

      <!-- Round info -->
      <div v-if="block.rounds" class="text-6xl font-black text-gymOrange uppercase tracking-normal font-condensed text-center mb-6">
        {{ block.rounds }} RONDAS
      </div>

      <!-- familyInfo varies by subcase -->

      <!-- sameReps: big rep square + "cada ronda" -->
      <div v-if="subcase === 'sameReps'" class="flex flex-col items-center gap-3">
        <span class="inline-flex items-center justify-center w-28 h-28 bg-gymOrange rounded-2xl text-6xl font-black text-white font-condensed">
          {{ block.repsEveryRound }}
        </span>
        <span class="text-2xl text-white/50 font-condensed uppercase">cada ronda</span>
      </div>

      <!-- perRound: series breakdown -->
      <div v-else-if="subcase === 'perRound' && block.repsPerRound" class="flex flex-col items-center gap-3">
        <div v-for="(reps, i) in block.repsPerRound" :key="i" class="flex items-center gap-3">
          <span class="inline-flex items-center justify-center w-16 h-16 bg-gymOrange rounded-xl text-3xl font-black text-white font-condensed">
            {{ reps }}
          </span>
          <span class="text-xl text-white/50 font-condensed uppercase">ronda {{ i + 1 }}</span>
        </div>
      </div>

      <!-- perExercise: empty familyInfo (reps shown in exercise list) -->
    </div>

    <!-- Right Panel (70%) — Exercise List -->
    <div class="w-[70%] flex items-center justify-center px-12">
      <TvExerciseList
        :exercises="block.exercises"
        :showRepBadges="subcase !== 'sameReps'"
      />
    </div>

    <!-- Info Pill — Elapsed Time (stopwatch) -->
    <TvInfoPill label="Tiempo" :value="elapsedDisplay" />
  </div>
</template>
