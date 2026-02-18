<script setup>
import { computed } from 'vue'
import { formatTimerTwoLine } from '../../utils/time'

const props = defineProps({
  secondsLeft: Number,
  isResting: Boolean,
})

const formatted = computed(() => formatTimerTwoLine(props.secondsLeft))

const isExpired = computed(() => props.secondsLeft <= 0)
</script>

<template>
  <div class="flex flex-col items-center justify-center">
    <div
      v-if="isExpired"
      class="text-9xl font-black text-gymOrange uppercase tracking-normal font-condensed animate-pulse"
    >
      ¡TIEMPO!
    </div>
    <template v-else>
      <div
        v-if="formatted.minutes"
        class="text-[12rem] font-black uppercase tracking-normal font-condensed tabular-nums leading-none"
        :class="isResting ? 'text-gymRest' : 'text-gymOrange'"
      >
        {{ formatted.minutes }}
      </div>
      <div
        class="text-[12rem] font-black uppercase tracking-normal font-condensed tabular-nums leading-none"
        :class="isResting ? 'text-gymRest' : 'text-gymOrange'"
      >
        {{ formatted.seconds }}
      </div>
    </template>
  </div>
</template>
