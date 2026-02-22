<script setup>
const props = defineProps({
  tagGroups: { type: Array, required: true },
  modelValue: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

function toggle(id) {
  if (props.readonly) return
  const next = props.modelValue.includes(id)
    ? props.modelValue.filter((t) => t !== id)
    : [...props.modelValue, id]
  emit('update:modelValue', next)
}
</script>

<template>
  <div :class="compact ? 'space-y-2' : 'space-y-3'">
    <div v-for="group in tagGroups" :key="group.id">
      <label :class="['block mb-1.5', compact ? 'text-xs text-white/50' : 'text-xs text-white/60']">
        {{ group.label }}
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tag in group.tags"
          :key="tag.id"
          type="button"
          :disabled="readonly"
          @click="toggle(tag.id)"
          :class="[
            'px-3 py-1.5 text-xs rounded-lg border transition-colors disabled:cursor-default',
            modelValue.includes(tag.id)
              ? 'bg-gymOrange/20 text-gymOrange border-gymOrange/30'
              : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30 disabled:hover:border-white/10',
          ]"
        >
          {{ tag.label }}
        </button>
      </div>
    </div>
  </div>
</template>
