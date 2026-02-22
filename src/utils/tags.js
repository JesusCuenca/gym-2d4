export const BLOCK_TAG_GROUPS = [
  {
    id: 'fase',
    label: 'Fase del entrenamiento',
    tags: [
      { id: 'calentamiento', label: 'Calentamiento' },
      { id: 'entrenamiento', label: 'Entrenamiento' },
      { id: 'vuelta-a-la-calma', label: 'Vuelta a la calma' },
    ],
  },
  {
    id: 'zona',
    label: 'Zona corporal',
    tags: [
      { id: 'tren-superior', label: 'Tren superior' },
      { id: 'tren-inferior', label: 'Tren inferior' },
      { id: 'parte-delantera', label: 'Parte delantera' },
      { id: 'parte-trasera', label: 'Parte trasera' },
      { id: 'espalda', label: 'Espalda' },
      { id: 'piernas', label: 'Piernas' },
      { id: 'brazos', label: 'Brazos' },
      { id: 'pecho', label: 'Pecho' },
      { id: 'core', label: 'Core' },
      { id: 'full-body', label: 'Full body' },
    ],
  },
]

export const CLASS_TAG_GROUPS = [
  {
    id: 'tipo',
    label: 'Tipo de entrenamiento',
    tags: [
      { id: 'funcional', label: 'Entrenamiento funcional' },
      { id: 'tonificacion', label: 'Tonificación' },
      { id: 'fuerza', label: 'Fuerza' },
      { id: 'cardio', label: 'Cardio' },
      { id: 'hiit', label: 'HIIT' },
      { id: 'movilidad', label: 'Movilidad' },
      { id: 'resistencia', label: 'Resistencia' },
    ],
  },
  {
    id: 'zona',
    label: 'Zona corporal',
    tags: [
      { id: 'tren-superior', label: 'Tren superior' },
      { id: 'tren-inferior', label: 'Tren inferior' },
      { id: 'parte-delantera', label: 'Parte delantera' },
      { id: 'parte-trasera', label: 'Parte trasera' },
      { id: 'full-body', label: 'Full body' },
    ],
  },
]

export const BLOCK_TAGS = BLOCK_TAG_GROUPS.flatMap((g) => g.tags)
export const CLASS_TAGS = CLASS_TAG_GROUPS.flatMap((g) => g.tags)

export function getBlockTagLabel(id) {
  return BLOCK_TAGS.find((t) => t.id === id)?.label ?? id
}

export function getClassTagLabel(id) {
  return CLASS_TAGS.find((t) => t.id === id)?.label ?? id
}
