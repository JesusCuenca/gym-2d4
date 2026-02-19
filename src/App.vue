<script setup>
import { RouterView } from 'vue-router'
import AppToaster from './components/AppToaster.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import ExercisePickerModal from './components/ExercisePickerModal.vue'
</script>

<template>
  <RouterView />
  <AppToaster />
  <ConfirmModal />
  <ExercisePickerModal />
</template>
