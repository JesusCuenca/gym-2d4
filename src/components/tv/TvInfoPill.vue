<script setup>
defineProps({
  label: String,
  value: String,
})
</script>

<template>
  <div class="absolute bottom-8 right-8 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 flex items-center gap-3">
    <span class="text-white/50 text-lg uppercase tracking-wider font-condensed">{{ label }}</span>
    <span class="text-white text-2xl font-black font-condensed">{{ value }}</span>
  </div>
</template>
