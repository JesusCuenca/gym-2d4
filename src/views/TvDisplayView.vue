<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <h1 class="text-4xl font-bold text-gymOrange">TV Display — {{ route.params.id }}</h1>
  </div>
</template>
