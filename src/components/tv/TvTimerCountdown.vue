<script setup>
import { computed } from 'vue'
import { formatTimer } from '../../utils/time'

const props = defineProps({
  timeCapSeconds: Number,
  displaySeconds: Number,
})

const remaining = computed(() => {
  return Math.max(0, (props.timeCapSeconds || 0) - props.displaySeconds)
})

const display = computed(() => formatTimer(remaining.value))

const isExpired = computed(() => remaining.value <= 0 && props.displaySeconds > 0)
</script>

<template>
  <div class="flex flex-col items-center justify-center">
    <div
      v-if="isExpired"
      class="text-9xl font-black text-gymOrange uppercase tracking-normal font-condensed animate-pulse"
    >
      ¡TIEMPO!
    </div>
    <div
      v-else
      class="text-9xl font-black text-gymOrange uppercase tracking-normal font-condensed tabular-nums"
    >
      {{ display }}
    </div>
  </div>
</template>
