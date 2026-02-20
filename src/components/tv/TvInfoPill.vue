<script setup>
defineProps({
  label: String,
  value: String,
})
</script>

<template>
  <div class="absolute bottom-8 right-8 flex flex-col items-center gap-1">
    <span class="text-white/50 text-2xl uppercase tracking-wider font-condensed">{{ label }}</span>
    <div class="bg-white/10 backdrop-blur-sm rounded-full px-8 py-4">
      <span class="text-white text-5xl uppercase font-black font-condensed tabular-nums">{{ value }}</span>
    </div>
  </div>
</template>
