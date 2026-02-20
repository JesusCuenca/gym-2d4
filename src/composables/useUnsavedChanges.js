import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useConfirm } from './useConfirm'

export function useUnsavedChanges(formGetter) {
  const { confirm } = useConfirm()
  const isDirty = ref(false)
  let initialSnapshot = null

  function takeSnapshot() {
    initialSnapshot = JSON.stringify(formGetter())
    isDirty.value = false
  }

  function markClean() {
    takeSnapshot()
  }

  watch(formGetter, () => {
    if (initialSnapshot === null) return
    isDirty.value = JSON.stringify(formGetter()) !== initialSnapshot
  }, { deep: true })

  onBeforeRouteLeave(async () => {
    if (!isDirty.value) return true
    const leave = await confirm({
      title: 'Cambios sin guardar',
      message: '¿Estás seguro de que quieres salir? Los cambios no guardados se perderán.',
      confirmLabel: 'Salir sin guardar',
      danger: true,
    })
    return leave
  })

  function handleBeforeUnload(e) {
    if (isDirty.value) {
      e.preventDefault()
      e.returnValue = ''
    }
  }

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  return { isDirty, markClean, takeSnapshot }
}
