<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
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

const elapsedDisplay = computed(() => formatTimer(props.timer.displaySeconds))

const perRoundTier = computed(() => {
  const count = props.block.repsPerRound?.length || 0
  if (count <= 3) return { badge: 'w-24 h-24 text-tv-emphasis rounded-2xl', text: 'text-tv-label-lg', gap: 'gap-5' }
  if (count <= 6) return { badge: 'w-20 h-20 text-tv-body rounded-xl', text: 'text-tv-label', gap: 'gap-4' }
  return { badge: 'w-16 h-16 text-tv-label-lg rounded-xl', text: 'text-xl', gap: 'gap-3' }
})

// Auto-scale for perRound left panel
const perRoundContainerRef = ref(null)
const perRoundListRef = ref(null)
const perRoundScale = ref(1)

function recalculatePerRoundScale() {
  if (!perRoundListRef.value || !perRoundContainerRef.value) return
  const listH = perRoundListRef.value.scrollHeight
  const containerH = perRoundContainerRef.value.clientHeight
  perRoundScale.value = listH > containerH ? containerH / listH : 1
}

let resizeObserver = null

onMounted(() => {
  recalculatePerRoundScale()
  if (perRoundListRef.value) {
    resizeObserver = new ResizeObserver(recalculatePerRoundScale)
    resizeObserver.observe(perRoundListRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

watch(() => props.block.repsPerRound?.length, async () => {
  await nextTick()
  recalculatePerRoundScale()
})
</script>

<template>
  <div class="flex h-full relative">
    <TvProgressBar :block="block" :timer="timer" :blockIndex="session.currentBlockIndex"
      :totalBlocks="session.blocks?.length || 0" />

    <!-- Left Panel (30%) — Round Info & Reps -->
    <div class="w-[30%] flex flex-col items-center border-r border-white/10 px-6">
      <!-- Top: block name -->
      <p class="pt-10 text-tv-label-lg font-black text-white/70 uppercase tracking-normal font-condensed">
        {{ block.name }}
      </p>

      <!-- Center: reps content -->
      <div class="flex-1 flex flex-col items-center justify-center overflow-hidden">
        <!-- sameReps: big rep square + label -->
        <div v-if="subcase === 'sameReps'" class="flex flex-col items-center gap-4">
          <span
            class="inline-flex items-center justify-center w-44 h-44 bg-gymOrange rounded-3xl text-tv-display font-black text-white font-condensed leading-none">
            {{ block.repsEveryRound }}
          </span>
          <span class="text-tv-label text-white/70 font-condensed uppercase">reps cada ronda</span>
        </div>

        <!-- perRound: series breakdown with auto-scale -->
        <div v-else-if="subcase === 'perRound' && block.repsPerRound" ref="perRoundContainerRef"
          class="h-full w-full flex items-center justify-center overflow-hidden">
          <div ref="perRoundListRef" class="flex flex-col items-center origin-center"
            :class="perRoundTier.gap"
            :style="{ transform: `scale(${perRoundScale})` }">
            <div v-for="(reps, i) in block.repsPerRound" :key="i" class="flex items-center gap-3">
              <span class="text-white/70 font-condensed uppercase" :class="perRoundTier.text">
                ronda {{ i + 1 }}
              </span>
              <span class="inline-flex items-center justify-center bg-gymOrange font-black text-white font-condensed"
                :class="perRoundTier.badge">
                {{ reps }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom: round info -->
      <p v-if="block.rounds" class="pb-10 text-tv-emphasis font-black text-gymOrange uppercase tracking-normal font-condensed">
        {{ block.rounds }} RONDAS
      </p>
    </div>

    <!-- Right Panel (70%) — Exercise List -->
    <div class="w-[70%] h-full flex items-center justify-center px-12 pb-16">
      <TvExerciseList :exercises="block.exercises" :showRepBadges="subcase !== 'sameReps'" />
    </div>

    <!-- Info Pill — Elapsed Time (stopwatch) -->
    <TvInfoPill label="Tiempo" :value="elapsedDisplay" />
  </div>
</template>
