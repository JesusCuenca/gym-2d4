<script setup>
import { computed } from 'vue'
import { isTimed } from '../../models/blockTypes'
import TvTimedLayout from './TvTimedLayout.vue'
import TvRepsLayout from './TvRepsLayout.vue'
import TvRestScreen from './TvRestScreen.vue'
import TvFinishedScreen from './TvFinishedScreen.vue'

const props = defineProps({
  session: Object,
  timer: Object,
})

const currentBlock = computed(() => {
  return props.session?.blocks?.[props.session.currentBlockIndex]?.blockData
})

const isFinished = computed(() => props.session?.sessionState === 'completed')
const isStopped = computed(() => props.session?.clockState === 'stopped' && props.session?.accumulatedTime === 0)
const isCountdown = computed(() => props.session?.clockState === 'countdown')

const transitionKey = computed(() => {
  if (isFinished.value) return 'finished'
  if ((isStopped.value || isCountdown.value) && currentBlock.value) return `rest-${props.session.currentBlockIndex}`
  if (currentBlock.value) return `block-${props.session.currentBlockIndex}`
  return 'none'
})
</script>

<template>
  <Transition name="tv-block" mode="out-in">
    <TvFinishedScreen
      v-if="isFinished"
      :key="transitionKey"
      :session="session"
    />

    <TvRestScreen
      v-else-if="(isStopped || isCountdown) && currentBlock"
      :key="transitionKey"
      :block="currentBlock"
      :blockIndex="session.currentBlockIndex"
      :totalBlocks="session.blocks?.length || 0"
      :countdownNumber="timer.countdownSecondsLeft"
    />

    <TvTimedLayout
      v-else-if="currentBlock && isTimed(currentBlock.type)"
      :key="transitionKey"
      :block="currentBlock"
      :timer="timer"
      :session="session"
    />

    <TvRepsLayout
      v-else-if="currentBlock"
      :key="transitionKey"
      :block="currentBlock"
      :timer="timer"
      :session="session"
    />
  </Transition>
</template>
