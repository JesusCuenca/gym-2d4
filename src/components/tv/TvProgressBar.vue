<script setup>
import { computed } from 'vue'
import { isTimed } from '../../models/blockTypes'
import { getTotalDuration } from '../../utils/timeline'

const props = defineProps({
  block: Object,
  timer: Object,
  blockIndex: Number,
  totalBlocks: Number,
})

const isTimedBlock = computed(() => isTimed(props.block?.type))

const totalDuration = computed(() => getTotalDuration(props.block) || 0)

const phaseProgress = computed(() => {
  if (!isTimedBlock.value || totalDuration.value <= 0) return 0
  const elapsed = props.timer.displaySeconds
  return Math.min(1, Math.max(0, elapsed / totalDuration.value))
})

const phaseColorClass = computed(() =>
  props.timer.isResting ? 'bg-gymRest' : 'bg-gymOrange'
)

const classProgress = computed(() => {
  if (!props.totalBlocks || props.totalBlocks <= 0) return 0
  const blockFraction = 1 / props.totalBlocks
  const baseProgress = props.blockIndex * blockFraction
  const blockProgress = isTimedBlock.value ? phaseProgress.value : 0
  return Math.min(1, baseProgress + blockProgress * blockFraction)
})
</script>

<template>
  <div class="absolute top-0 left-0 right-0 z-50">
    <!-- Phase bar (timed blocks only) -->
    <div v-if="isTimedBlock" class="h-1 w-full bg-white/5">
      <div
        class="h-full transition-all duration-300 ease-linear animate-progress-glow"
        :class="phaseColorClass"
        :style="{ width: `${phaseProgress * 100}%` }"
      />
    </div>
    <!-- Class bar (always shown) -->
    <div class="h-0.5 w-full bg-white/5">
      <div
        class="h-full bg-white/30 transition-all duration-500 ease-linear"
        :style="{ width: `${classProgress * 100}%` }"
      />
    </div>
  </div>
</template>
