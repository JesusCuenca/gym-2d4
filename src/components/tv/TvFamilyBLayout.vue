<script setup>
import TvExerciseList from './TvExerciseList.vue'
import TvInfoPill from './TvInfoPill.vue'
import TvTimerCountup from './TvTimerCountup.vue'
import { computed } from 'vue'
import { formatTimer } from '../../utils/time'

const props = defineProps({
  block: Object,
  displaySeconds: Number,
  session: Object,
})

const roundsDisplay = computed(() => {
  if (props.block?.repScheme) return props.block.repScheme
  if (props.block?.rounds) return `${props.block.rounds} ROUNDS`
  return ''
})

const elapsedDisplay = computed(() => formatTimer(props.displaySeconds))
</script>

<template>
  <div class="flex h-full relative">
    <!-- Left Panel (30%) — Round Info -->
    <div class="w-[30%] flex flex-col items-center justify-center border-r border-white/10 px-6">
      <p class="text-3xl font-black text-white/60 uppercase tracking-tighter font-condensed mb-6">
        {{ block.name }}
      </p>
      <div v-if="roundsDisplay" class="text-6xl font-black text-gymOrange uppercase tracking-tighter font-condensed text-center">
        {{ roundsDisplay }}
      </div>
    </div>

    <!-- Right Panel (70%) — Exercise List with Rep Squares -->
    <div class="w-[70%] flex items-center justify-center px-12">
      <TvExerciseList :exercises="block.exercises" />
    </div>

    <!-- Info Pill — Elapsed Time -->
    <TvInfoPill label="Time" :value="elapsedDisplay" />
  </div>
</template>
