<script setup>
import { computed } from 'vue'
import { formatTimer } from '../../utils/time'

const props = defineProps({
  displaySeconds: Number,
})

const display = computed(() => formatTimer(props.displaySeconds))
</script>

<template>
  <span class="font-black font-condensed tabular-nums">{{ display }}</span>
</template>
