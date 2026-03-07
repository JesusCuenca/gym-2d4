<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  exercises: Array,
  showRepBadges: {
    type: Boolean,
    default: true,
  },
})

const containerRef = ref(null)
const listRef = ref(null)
const scaleFactor = ref(1)

const sizeTier = computed(() => {
  const count = props.exercises?.length || 0
  if (count <= 2) return 'xl'
  if (count <= 4) return 'lg'
  if (count <= 6) return 'md'
  if (count <= 8) return 'sm'
  return 'xs'
})

const tierClasses = computed(() => {
  const tiers = {
    xl: { gap: 'gap-8', name: 'text-tv-heading', notes: 'text-tv-body', badge: 'w-28 h-28 text-tv-subheading rounded-2xl', itemGap: 'gap-6' },
    lg: { gap: 'gap-6', name: 'text-tv-subtitle', notes: 'text-tv-label-lg', badge: 'w-24 h-24 text-tv-emphasis rounded-2xl', itemGap: 'gap-5' },
    md: { gap: 'gap-5', name: 'text-tv-subheading', notes: 'text-tv-label', badge: 'w-20 h-20 text-tv-body rounded-xl', itemGap: 'gap-5' },
    sm: { gap: 'gap-4', name: 'text-tv-emphasis', notes: 'text-xl', badge: 'w-[4.5rem] h-[4.5rem] text-tv-label-lg rounded-xl', itemGap: 'gap-4' },
    xs: { gap: 'gap-3', name: 'text-tv-body', notes: 'text-lg', badge: 'w-16 h-16 text-tv-label-lg rounded-xl', itemGap: 'gap-4' },
  }
  return tiers[sizeTier.value]
})

function recalculateScale() {
  if (!listRef.value || !containerRef.value) return
  const listH = listRef.value.scrollHeight
  const containerH = containerRef.value.clientHeight
  scaleFactor.value = listH > containerH ? containerH / listH : 1
}

let resizeObserver = null

onMounted(() => {
  recalculateScale()
  if (listRef.value) {
    resizeObserver = new ResizeObserver(recalculateScale)
    resizeObserver.observe(listRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

watch(() => props.exercises?.length, async () => {
  await nextTick()
  recalculateScale()
})
</script>

<template>
  <div ref="containerRef" class="h-full w-full flex items-center justify-center overflow-hidden">
    <div ref="listRef" class="flex flex-col origin-center" :class="tierClasses.gap"
      :style="{ transform: `scale(${scaleFactor})` }">
      <div v-for="(exercise, index) in exercises" :key="index" class="flex items-center" :class="tierClasses.itemGap">
        <!-- Rep badge -->
        <div v-if="showRepBadges && exercise.repsEveryRound" class="flex-shrink-0">
          <span class="inline-flex items-center justify-center bg-gymOrange font-black text-white font-condensed"
            :class="tierClasses.badge">
            {{ exercise.repsEveryRound }}
          </span>
        </div>

        <!-- Exercise name and notes -->
        <div class="flex-1 min-w-0">
          <p class="font-black text-white uppercase tracking-normal font-condensed truncate" :class="tierClasses.name">
            {{ exercise.name }}
          </p>
          <p v-if="exercise.notes" class="text-white/70 font-condensed uppercase" :class="tierClasses.notes">
            {{ exercise.notes }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
