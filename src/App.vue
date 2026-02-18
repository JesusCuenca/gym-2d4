<script setup>
import { RouterView } from 'vue-router'
import AppToaster from './components/AppToaster.vue'
import ConfirmModal from './components/ConfirmModal.vue'
</script>

<template>
  <RouterView />
  <AppToaster />
  <ConfirmModal />
</template>
