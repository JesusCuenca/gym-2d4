<script setup>
import { computed } from 'vue'
import TvFamilyALayout from './TvFamilyALayout.vue'
import TvFamilyBLayout from './TvFamilyBLayout.vue'
import TvRestScreen from './TvRestScreen.vue'
import TvFinishedScreen from './TvFinishedScreen.vue'

const props = defineProps({
  session: Object,
  displaySeconds: Number,
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

  <TvFamilyALayout
    v-else-if="currentBlock?.family === 'timeBased'"
    :block="currentBlock"
    :displaySeconds="displaySeconds"
    :session="session"
  />

  <TvFamilyBLayout
    v-else-if="currentBlock"
    :block="currentBlock"
    :displaySeconds="displaySeconds"
    :session="session"
  />
</template>
