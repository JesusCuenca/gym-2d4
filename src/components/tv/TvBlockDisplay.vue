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

const isFinished = computed(() => props.session?.sessionState === 'finished')
const isStopped = computed(() => props.session?.clockState === 'stopped' && props.session?.accumulatedTime === 0)
</script>

<template>
  <TvFinishedScreen v-if="isFinished" />

  <TvRestScreen
    v-else-if="isStopped && currentBlock"
    :block="currentBlock"
    :blockIndex="session.currentBlockIndex"
    :totalBlocks="session.blocks?.length || 0"
  />

  <TvTimedLayout
    v-else-if="currentBlock && isTimed(currentBlock.type)"
    :block="currentBlock"
    :timer="timer"
    :session="session"
  />

  <TvRepsLayout
    v-else-if="currentBlock"
    :block="currentBlock"
    :timer="timer"
    :session="session"
  />
</template>
