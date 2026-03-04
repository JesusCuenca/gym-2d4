<script setup>
defineProps({
  label: String,
  value: String,
})
</script>

<template>
  <div class="absolute bottom-[2vw] right-[2vw] flex flex-col items-center gap-[0.4vw]">
    <span class="text-white/70 text-tv-label uppercase tracking-wider font-condensed">{{ label }}</span>
    <div class="bg-white/10 backdrop-blur-sm rounded-full px-[2vw] py-[1vw]">
      <span class="text-white text-tv-emphasis uppercase font-black font-condensed tabular-nums">{{ value }}</span>
    </div>
  </div>
</template>
