<script setup>
import { computed } from 'vue'
import { formatTimerTwoLine } from '../../utils/time'

const props = defineProps({
  secondsLeft: Number,
  isResting: Boolean,
  urgencyThreshold: { type: Number, default: 5 },
})

const formatted = computed(() => formatTimerTwoLine(props.secondsLeft))

const isExpired = computed(() => props.secondsLeft <= 0)

const isUrgent = computed(() =>
  props.secondsLeft > 0 && props.secondsLeft <= props.urgencyThreshold
)

const timerColorClass = computed(() => {
  if (isUrgent.value && !props.isResting) return 'text-gymDanger'
  if (props.isResting) return 'text-gymRest'
  return 'text-gymOrange'
})
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
        class="text-[12rem] font-black uppercase tracking-normal font-condensed tabular-nums leading-none transition-colors duration-300"
        :class="[timerColorClass, { 'animate-urgency-pulse animate-urgency-scale': isUrgent }]"
      >
        {{ formatted.minutes }}
      </div>
      <div
        class="text-[12rem] font-black uppercase tracking-normal font-condensed tabular-nums leading-none transition-colors duration-300"
        :class="[timerColorClass, { 'animate-urgency-pulse animate-urgency-scale': isUrgent }]"
      >
        {{ formatted.seconds }}
      </div>
    </template>
  </div>
</template>
