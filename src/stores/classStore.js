import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useClassStore = defineStore('class', () => {
  const activeClass = ref(null)
  const isLive = ref(false)

  function setActiveClass(classData) {
    activeClass.value = classData
    isLive.value = true
  }

  function clearActiveClass() {
    activeClass.value = null
    isLive.value = false
  }

  return { activeClass, isLive, setActiveClass, clearActiveClass }
})
