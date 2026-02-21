<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="min-h-screen bg-gymBlack flex flex-col items-center justify-center text-white px-6">
    <p class="text-[10rem] font-black font-condensed text-gymOrange uppercase leading-none tracking-tighter">
      404
    </p>
    <p class="text-4xl font-black font-condensed uppercase tracking-tighter mt-2">
      Página no encontrada
    </p>
    <p class="text-xl text-white/50 font-condensed mt-4 mb-10">
      La URL que buscas no existe.
    </p>
    <button
      @click="router.push('/admin')"
      class="bg-gymOrange text-white font-black font-condensed uppercase text-xl px-10 py-4 rounded-xl hover:bg-orange-500 transition-colors"
    >
      Ir al panel
    </button>
  </div>
</template>
