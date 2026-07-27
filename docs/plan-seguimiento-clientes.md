# Plan: Seguimiento de clientes de entrenamiento personal ("Clientes")

## Context

El gimnasio ahora ofrece entrenamientos personales con seguimiento del progreso. La app debe permitir al entrenador: dar de alta clientes (personas del gimnasio, **sin cuenta en la app**), anotar mediciones periódicas (báscula Tanita + perímetros corporales) y ver su evolución con gráficas. Además, cada cliente podrá ver su propio progreso en una **página personal accesible por enlace privado sin login** (mismo patrón que la TV pública `/tv/:id`).

Decisiones confirmadas con el usuario:
- Métricas Tanita: peso, % grasa, % hueso, % músculo, perfil corporal (1–9), metabolismo basal, edad metabólica, ingesta calórica diaria, grasa visceral. Más perímetros en cm (cintura, cadera, pecho, brazo izq./der., muslo izq./der.).
- El cliente accede por URL única con token, sin cuentas ni roles nuevos.
- Con gráficas de línea (se añade librería ligera).
- Ficha de cliente con dos campos de notas: **notas alimenticias** (`dietaryNotes` — intolerancias, preferencias) y **notas generales** (`notes`).

## Decisiones de diseño clave

- **D1 — Mediciones como subcolección** `clients/{clientId}/measurements`, no colección top-level. Las reglas de Firestore no pueden inspeccionar cláusulas `where()`; con subcolección el `clientId` forma parte del *path*, así que `allow read: if true` solo permite listar mediciones bajo un clientId que ya conoces. Sin regla `collection-group`, la enumeración cruzada es imposible. Es el único diseño que cumple "legible sin auth por enlace privado, no enumerable".
- **D2 — El doc ID autogenerado de Firestore es el token** del enlace: `/progreso/:clientId` (20 chars aleatorios ≈ 119 bits, no adivinable). En reglas se separa `get` (público) de `list` (solo auth) — a diferencia de `screens`/`sessions` que usan `read: if true` global.
- **D3 — `measuredAt` como string `'YYYY-MM-DD'`** (mapea 1:1 con `<input type="date">`, ordena lexicográficamente, sin bugs de timezone). `createdAt` sigue siendo serverTimestamp.
- **D4 — `measurementStore` hecho a mano** (precedente: `src/stores/sessionStore.js`). `useFirestoreCrud` está atado a colecciones top-level y su `fetchOwn` (where uid) no sirve: necesitamos todas las mediciones de un cliente, ordenadas por `measuredAt`, legibles **sin auth**. No generalizar el composable para un solo consumidor.
- **D5 — Gráficas: `chart.js` v4 + `vue-chartjs` v5**, tree-shaken (registrar solo LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler ≈ 55 KB gz). Las rutas ya son lazy `import()`, así que Vite lo separa en chunk propio y el bundle de la TV no cambia. Usar **CategoryScale con fechas formateadas** (TimeScale exigiría un date-adapter extra; para mediciones mensuales dispersas el espaciado por categoría es correcto).
- Verificado en código: `BottomSheet.vue` (props `open`/`title`, emit `close`, slot) sirve para el formulario de medición; `useFirestoreCrud.getById` es un `getDoc` simple sin dependencia de auth → la página pública puede usar `clientStore.getClient()` tal cual.

## Modelo de datos (camelCase inglés, según CLAUDE.md)

`clients/{clientId}`:
- `name` (string, obligatorio), `email` (string|null), `phone` (string|null), `birthDate` ('YYYY-MM-DD'|null), `heightCm` (number|null), `dietaryNotes` (string|null — intolerancias/preferencias alimentarias), `notes` (string|null — notas generales), `uid`, `createdAt`.

`clients/{clientId}/measurements/{measurementId}`:
- `measuredAt` ('YYYY-MM-DD', obligatorio), `notes` (string|null), `uid`, `createdAt`, y 17 métricas (number|null): `weightKg`, `bodyFatPct`, `bonePct`, `waterPct`, `musclePct`, `bodyProfile`, `basalMetabolicRate`, `metabolicAge`, `dailyCalorieIntake`, `visceralFat`, `waistCm`, `hipCm`, `chestCm`, `armLeftCm`, `armRightCm`, `thighLeftCm`, `thighRightCm`.

## Fase 1 — Fundamentos

1. **Nuevo `src/models/measurementMetrics.js`** — fuente única iterada por formulario, tabla, tarjetas y gráficas:
   - `METRIC_GROUPS = [{key:'tanita', label:'Báscula Tanita'}, {key:'girths', label:'Perímetros (cm)'}]`
   - `MEASUREMENT_METRICS`: array de `{ key, label (español), unit, decimals, group, lowerIsBetter (true|false|null), min, max, integer? }`. Ej.: `{ key:'weightKg', label:'Peso', unit:'kg', decimals:1, group:'tanita', lowerIsBetter:true, min:20, max:300 }`; `visceralFat` (1–59, integer), `bodyProfile` (1–9, integer, neutral), `metabolicAge` (12–99, lowerIsBetter), perímetros 10–250 cm (cintura/cadera lowerIsBetter, resto neutral).
   - Helpers: `METRIC_KEYS`, `getMetric(key)`, `formatMetricValue(key, value)`.
2. **Modificar `src/utils/validation.js`** — añadir a `CHAR_LIMITS`: `clientName: 50`, `clientNotes: 500`, `measurementNotes: 200`. Nuevas `validateClient(data)` (name obligatorio + longitud; heightCm 50–250 si presente; birthDate formato fecha; email regex básica) y `validateMeasurement(data)` (measuredAt obligatorio y fecha válida; **al menos una métrica rellena** — `'Debes rellenar al menos una medida.'`; cada métrica dentro de su min/max con mensaje con label y rango; enteros donde `integer:true`). Devuelven `{valid:true}` | `{valid:false, message}` como las existentes.
3. **Nuevos `src/utils/clientForm.js` y `src/utils/measurementForm.js`** (espejo de `src/utils/blockForm.js`): `createEmptyClientForm()`, `clientToForm()`, `formToClientData()` (''→null, heightCm→Number); `createEmptyMeasurementForm()` (measuredAt = hoy, itera MEASUREMENT_METRICS), `measurementToForm()`, `formToMeasurementData()` (normaliza coma decimal '78,4'→78.4, ''→null).
4. **Modificar `firestore.rules`** — añadir dentro de `match /databases/{database}/documents`:

```
// Clients: single-doc public read via unguessable ID (private progress link).
// LIST requires auth — unauthenticated users must NOT enumerate clients.
match /clients/{clientId} {
  allow get: if true;
  allow list: if request.auth != null;
  allow create: if request.auth != null
                && request.resource.data.uid == request.auth.uid;
  allow update: if request.auth != null
                && resource.data.uid == request.auth.uid
                && request.resource.data.uid == resource.data.uid;
  allow delete: if request.auth != null
                && resource.data.uid == request.auth.uid;

  // Measurements: readable only under a known clientId (path-scoped;
  // no collection-group rule → cross-client enumeration impossible).
  match /measurements/{measurementId} {
    allow read: if true;
    allow create: if request.auth != null
                  && request.resource.data.uid == request.auth.uid;
    allow update: if request.auth != null
                  && resource.data.uid == request.auth.uid
                  && request.resource.data.uid == resource.data.uid;
    allow delete: if request.auth != null
                  && resource.data.uid == request.auth.uid;
  }
}
```
   Desplegar con `firebase deploy --only firestore:rules`.

## Fase 2 — Stores

1. **Nuevo `src/stores/clientStore.js`** (~30 líneas, patrón `blockStore.js` sobre `useFirestoreCrud('clients', { validateFn: validateClient, labels: { item:'cliente', items:'clientes' } })`), exportando alias `fetchClients`/`fetchAllClients`/`getClient`/`createClient`/`updateClient`. Excepción: `deleteClient(id)` propio que **borra en cascada** la subcolección (`getDocs` de measurements → `writeBatch` en trozos de ≤500 → después `crud.remove(id)`; el doc del cliente se borra el último para que un fallo parcial sea reintentable).
2. **Nuevo `src/stores/measurementStore.js`** (a mano, ~90 líneas, convenciones de error de `useFirestoreCrud`: lecturas set error sin throw, escrituras set error + throw, actualizaciones optimistas manteniendo `measurements` ordenado por `measuredAt` ascendente):
   - `fetchMeasurements(clientId)` — `getDocs(query(collection(db,'clients',clientId,'measurements'), orderBy('measuredAt','asc')))`; funciona sin auth (página pública). OrderBy de un solo campo: no necesita índice compuesto.
   - `createMeasurement(clientId, data)` (valida, añade `uid` + `createdAt: serverTimestamp()`), `updateMeasurement(clientId, measurementId, data)`, `deleteMeasurement(clientId, measurementId)`, `$reset()`.

## Fase 3 — Router y navegación

1. **Modificar `src/router/index.js`**:
   - Ruta pública top-level (sin meta, como `/tv/:id`): `{ path: '/progreso/:clientId', name: 'client-progress', component: () => import('../views/ClientProgressView.vue') }`.
   - Hijas de `/admin` (paths en español, nombres `admin-*`, lazy): `clientes` → `admin-clients`; `clientes/nuevo` → `admin-client-create`; `clientes/:id/editar` → `admin-client-edit` (mismo componente que create, `props:true`); `clientes/:id` → `admin-client-detail` (`props:true`).
2. **Modificar `src/layouts/AdminLayout.vue`**: entrada "Clientes" (`UsersIcon` de heroicons 24/outline) en **las dos** listas de nav hardcodeadas (fila desktop y overlay móvil Teleport), entre Clases y Pantallas.

## Fase 4 — Vistas admin de lista y formulario

1. **Nuevo `src/views/AdminClientsView.vue`** (clon estructural de `AdminBlocksView.vue`): `onMounted` → `userStore.fetchAllUsers()` + `clientStore.fetchAllClients()`; `ListFilterBar` + `useListFilters` (solo búsqueda/usuario/fecha, sin type/tag; filtro por defecto 'mine' como bloques); AppSpinner; dos estados vacíos; grid de tarjetas TransitionGroup — la tarjeta entera enlaza a `admin-client-detail`; acciones editar/eliminar solo para el owner; borrado con `useConfirm()` (mensaje avisa "y todas sus mediciones") + `toastStore.show()`.
2. **Nuevo `src/views/AdminClientCreateView.vue`** (esqueleto de `AdminBlockCreateView.vue`): `isEditMode = !!route.params.id`; carga con `getClient` → `clientToForm`; campos: nombre (obligatorio), email, teléfono, fecha de nacimiento (`type="date"`), altura (`type="number"`), **notas alimenticias** (textarea, placeholder tipo "Intolerancias, alergias, preferencias…") y **notas** (textarea); clases de input estándar del proyecto; `useUnsavedChanges`; validar antes del store; `submitting` en try/finally; al guardar → toast + `router.push` al detalle.

## Fase 5 — Mediciones y gráficas

1. `npm install chart.js vue-chartjs`.
2. **Nuevo `src/components/clients/MetricChart.vue`** — registra los módulos de chart.js **solo dentro de este componente** (queda fuera de los chunks de TV/admin-core). Props: `metric` (objeto de MEASUREMENT_METRICS), `measurements` (array ascendente). Labels = measuredAt → `dd/mm/yy`; datos con `spanGaps` para saltar nulls; línea/puntos `#FB6537` (gymOrange) con relleno degradado sutil, grid `rgba(255,255,255,0.08)`, ticks `rgba(255,255,255,0.5)`, tooltip oscuro con `formatMetricValue`; altura fija ~180px, `maintainAspectRatio:false`.
3. **Nuevo `src/components/clients/MeasurementFormSheet.vue`** — envuelve `src/components/BottomSheet.vue`. Props: `open`, `measurement` (null = crear), `saving`; emits `close`, `submit(data)`. Contenido: input fecha (hoy por defecto), luego por cada METRIC_GROUP un h3 + grid responsive de inputs numéricos iterando MEASUREMENT_METRICS (label + sufijo unidad, `inputmode="decimal"`), notas. Usa los utils de measurementForm; `watch` de `open`/`measurement` para resetear; errores de validación inline.
4. **Nuevo `src/components/clients/MeasurementsTable.vue`** — props `measurements` (asc), `editable` (default false); emits `edit(m)`, `remove(m)`. Render más-reciente-primero; solo columnas de métricas con algún valor; cada celda: valor + delta pequeño vs medición cronológica anterior, coloreado según `lowerIsBetter` (verde mejora / `text-gymDanger` empeora / `white/40` neutro); móvil: `overflow-x-auto` con primera columna (fecha) sticky.
5. **Nuevo `src/utils/measurements.js`** — helpers compartidos por tabla/tarjetas/gráficas: `getDelta(measurements, index, key)`, `formatDelta(key, delta)`, `deltaTone(metric, delta)` → 'good'|'bad'|'neutral', `latestValue(measurements, key)`, `presentMetrics(measurements)` (métricas con ≥1 valor).
6. **Nuevo `src/views/AdminClientDetailView.vue`** — hub del cliente:
   - Carga en paralelo `getClient(id)` + `fetchMeasurements(id)`; AppSpinner; estado not-found.
   - Cabecera: nombre, línea de info (edad desde birthDate, altura, email/tel), badges/secciones de notas alimenticias y notas, enlace a editar.
   - Botón **"Copiar enlace privado"**: `navigator.clipboard.writeText(`${location.origin}/progreso/${id}`)` → toast 'Enlace copiado' (fallback: input readonly con la URL si clipboard falla).
   - CTA "Nueva medición" → `MeasurementFormSheet` (también para editar); submit → create/update + toast; borrar con `useConfirm`.
   - Secciones: `MeasurementsTable` (editable) → grid de `MetricChart` (una por métrica de `presentMetrics()` con ≥2 puntos).

## Fase 6 — Página pública de progreso

**Nuevo `src/views/ClientProgressView.vue`** (`/progreso/:clientId`, sin layout, sin auth):
- Mobile-first, `bg-gymBlack min-h-screen`, branding `font-condensed` como la TV; cabecera propia con saludo "Hola, {nombre}".
- Datos: `clientStore.getClient(clientId)` + `measurementStore.fetchMeasurements(clientId)` (permitidos sin auth por las nuevas reglas). Cliente null o error → pantalla amigable "Enlace no válido" (sin pistas de si el ID existe).
- Contenido de solo lectura: tarjetas resumen de la última medición (valor grande en gymOrange + chip de delta vs anterior, iterando `presentMetrics`), luego `MetricChart` por métrica (≥2 puntos), luego `MeasurementsTable :editable="false"`, pie "Última medición: {fecha}".
- **No renderizar** `email`, `phone`, `dietaryNotes` ni `notes` aquí (campos de uso del entrenador; ver Riesgo R1).

## Fase 7 — Tests (Vitest, `__tests__` colocados, solo utils puros — convención del repo)

- Ampliar `src/utils/__tests__/validation.test.js`: `validateClient` (sin nombre, nombre largo, heightCm inválida, válido) y `validateMeasurement` (sin measuredAt, formato de fecha malo, cero métricas, valor fuera de rango, visceralFat no entero, caso mínimo válido).
- Nuevos `src/utils/__tests__/clientForm.test.js` y `measurementForm.test.js` (espejo de `blockForm.test.js`): forma del form vacío, roundtrip, ''→null, decimales con coma.
- Nuevo `src/utils/__tests__/measurements.test.js`: deltas saltando nulls, `deltaTone` con lowerIsBetter true/false/null, `presentMetrics`.
- Nuevo `src/models/__tests__/measurementMetrics.test.js`: keys únicas, todos los campos obligatorios presentes, `formatMetricValue`.

## Verificación

1. `npm run test:run` y `npm run lint` pasan.
2. `npm run build` — chart.js solo debe aparecer en los chunks de ClientProgress/ClientDetail; el chunk de TvDisplayView no cambia de tamaño.
3. Manual (dev + reglas desplegadas): crear cliente → lista/editar/detalle; copiar enlace (probar en móvil); añadir 3 mediciones en fechas distintas (una retro-fechada) → tabla más-reciente-primero, deltas bien coloreados, gráficas cronológicas; editar y borrar una medición; borrar cliente con mediciones → comprobar en consola Firebase que la subcolección desapareció.
4. **Seguridad** (incógnito / Rules Playground):
   - `getDocs(collection(db,'clients'))` sin auth → permission-denied (list bloqueado).
   - `getDoc` de un cliente con ID conocido sin auth → permitido.
   - `collectionGroup('measurements')` con y sin auth → permission-denied.
   - Escrituras sin auth en clients/measurements → permission-denied; entrenador B no puede modificar clientes del entrenador A.
5. El primer `fetchClients` (fetchOwn) lanzará el error de Firestore con **enlace de creación de índice** compuesto (`uid asc, createdAt desc`) — abrirlo y crearlo (igual que las colecciones existentes; no hay `firestore.indexes.json` en el repo).

## Riesgos / notas

- **R1 — PII en el doc público**: `allow get: if true` expone el doc completo del cliente (email/teléfono/notas/notas alimenticias) a quien tenga el enlace — las reglas no ocultan campos. Mitigación: la página pública no los renderiza y el portador del enlace es el propio cliente. Endurecimiento futuro: mover los campos privados a `clients/{id}/private/profile` con lectura solo-auth.
- **R2 — Revocación del enlace**: el doc ID es el token; un enlace filtrado solo se revoca borrando y recreando el cliente. Aceptable para MVP; dejar comentario en código.
- **R3 — Borrado en cascada** es client-side; si falla a medias quedan mediciones huérfanas (inofensivas). Borrar el doc del cliente el último para que el reintento funcione.
- **R4 — Lista de perímetros**: añadir uno nuevo (gemelo, cuello…) es una línea en `measurementMetrics.js`.
- Visibilidad entre entrenadores: se sigue el patrón de bloques/clases (cualquier entrenador autenticado puede ver los clientes de otros, filtro por defecto 'mine'). Si se quisiera privacidad estricta por entrenador, bastaría cambiar la vista a `fetchClients` (fetchOwn) y endurecer `allow list`.

## Archivos críticos

- `firestore.rules` — nuevas reglas clients/measurements (get vs list).
- `src/models/measurementMetrics.js` (nuevo) — todo itera sobre él.
- `src/stores/measurementStore.js` (nuevo) — CRUD de subcolección a mano.
- `src/stores/clientStore.js` (nuevo) — useFirestoreCrud + borrado en cascada.
- `src/views/AdminClientDetailView.vue` (nuevo) — hub: enlace, CRUD mediciones, tabla, gráficas.
- `src/views/ClientProgressView.vue` (nuevo) — página pública del cliente.
- `src/router/index.js`, `src/layouts/AdminLayout.vue` — rutas y nav.
- Reutilizados: `useFirestoreCrud`, `useListFilters`/`ListFilterBar`, `useConfirm`, `toastStore`, `useUnsavedChanges`, `BottomSheet.vue`, patrón `blockForm.js`.
