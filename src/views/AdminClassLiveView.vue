<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <h1 class="text-3xl font-bold text-gymOrange">Clase en Vivo — {{ route.params.id }}</h1>
</template>
