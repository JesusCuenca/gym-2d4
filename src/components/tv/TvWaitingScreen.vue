<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import phrases from '../../utils/waitingPhrases'
defineProps({
  screenName: String,
})

const now = ref(new Date())
const currentPhraseIndex = ref(0)
const showPhrase = ref(true)

let clockInterval = null
let phraseInterval = null

const timeString = () => {
  return now.value.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const dateString = () => {
  return now.value.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

onMounted(() => {
  clockInterval = setInterval(() => {
    now.value = new Date()
  }, 1000)

  phraseInterval = setInterval(() => {
    showPhrase.value = false
    setTimeout(() => {
      currentPhraseIndex.value = (currentPhraseIndex.value + 1) % phrases.length
      showPhrase.value = true
    }, 500)
  }, 60000)
})

onUnmounted(() => {
  clearInterval(clockInterval)
  clearInterval(phraseInterval)
})
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full gap-8">
    <!-- Screen name pill -->
    <div v-if="screenName"
      class="absolute top-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-2">
      <span class="text-white/60 text-lg font-condensed uppercase tracking-wider">{{ screenName }}</span>
    </div>

    <!-- Logo -->
    <img src="/gym-2d4-logo.jpg" alt="2D4 Gym" class="w-40 h-40 object-contain rounded-2xl" />

    <!-- Clock + Date -->
    <div class="text-center">
      <p class="text-8xl font-black font-condensed text-white">
        {{ timeString() }}
      </p>
      <p class="text-2xl text-white/40 font-condensed uppercase tracking-wider mt-2">
        {{ dateString() }}
      </p>
    </div>

    <!-- Motivational phrase -->
    <div class="h-16 flex items-center justify-center">
      <Transition name="tv-phrase" mode="out-in">
        <p v-if="showPhrase" :key="currentPhraseIndex"
          class="text-4xl text-gymOrange font-black font-condensed uppercase tracking-wider">
          {{ phrases[currentPhraseIndex] }}
        </p>
      </Transition>
    </div>
  </div>
</template>
