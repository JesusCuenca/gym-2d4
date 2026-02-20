# 2D4 Gym TV — Wishlist de mejoras

## Admin Panel

### UX / Funcionalidad

- [x] **1. Busqueda y filtrado** — Las listas de bloques y clases no tienen buscador ni filtros. Anadir input de busqueda por nombre y filtros por tipo (timed/reps).
- [x] **2. Drag & drop** — Reordenar ejercicios y bloques con drag & drop (ej. `vuedraggable`) en lugar de solo flechas arriba/abajo.
- [ ] **3. Preview del TV** — Vista previa inline o modal de como se vera un bloque/clase en el TV antes de lanzar la sesion.
- [ ] **4. Historial de sesiones** — Guardar log de sesiones pasadas con fecha, duracion y bloques completados para que el trainer pueda revisar y repetir.
- [ ] **5. Duplicar clases con fecha** — Mejorar el clon para poder asignar fecha/dia, como base para un calendario semanal.
- [x] **6. Edicion en vivo** — Permitir ajustar tiempo restante o saltar a un bloque especifico durante una sesion live.
- [x] **7. Indicador de cambios sin guardar** — Avisar al usuario si navega fuera de un formulario con cambios sin guardar.

### Calidad de codigo (stores)

- [x] **8. Error handling en stores** — Anadir `try/catch` con feedback al usuario en todas las operaciones de `blockStore`, `classStore`, `sessionStore` y `screenStore`.
- [x] **9. Validacion de datos** — Validar estructura de bloques/clases/sesiones antes de escribir a Firestore (ej. exercises no vacio, workSeconds > 0).
- [x] **10. Cache consistente** — Actualizar el array local tras `create`/`update` en todos los stores, no solo tras `fetch`.

## TV Display

### Visual / Experiencia atleta

- [x] **11. Transiciones entre bloques/ejercicios** — Anadir `<Transition>` de Vue (fade, slide) al cambiar bloque, rotar ejercicios, o entrar/salir de descanso.
- [x] **12. Countdown visual de urgencia** — Efecto de parpadeo, cambio de color progresivo o escalado del timer en los ultimos 5-10 segundos.
- [x] **13. Barra de progreso** — Barra delgada en la parte superior mostrando progreso del bloque y/o de la clase completa.
- [x] **14. Pantalla de descanso enriquecida** — Mostrar countdown de preparacion (3, 2, 1), resumen del bloque que viene (duracion, ejercicios), o tips de recuperacion.
- [x] **15. Pantalla de finalizacion con stats** — Mostrar tiempo total, bloques completados y animacion celebratoria en lugar de solo "CLASE FINALIZADA".
- [x] **16. Indicador de ejercicio en rotate** — Mostrar "Ejercicio 2/4" en modo rotate para que los atletas sepan cuanto queda.
- [ ] **17. Audio cues** — Beep al cambiar de fase (work/rest), countdown audible en ultimos 3 segundos, sonido final. Configurable on/off.
- [ ] **18. Pantalla de espera mejorada** — Mostrar reloj actual, nombre del gym/screen, logo personalizable o frases motivacionales rotativas.

## Arquitectura / Infraestructura

- [x] **19. Timeout en initAuth()** — Anadir timeout a `initAuth()` en `main.js` para evitar pantalla en blanco si Firebase no responde.
- [x] **20. Cleanup de subscriptions** — Gestionar suscripciones multiples en `screenStore` y `sessionStore` para evitar listener leaks.
- [x] **21. Memoizacion del timeline** — Cachear `buildTimeline()` en `useTimer` para evitar recalculos innecesarios en bloques con muchos rounds/ejercicios.
- [x] **22. IDs de sesion robustos** — Usar auto-ID de Firestore (`addDoc`) en lugar de `Date.now()` para generar IDs de sesion.

## Aportes del usuario

### Interfaz

- [x] **23. Administración muy tosca** - La interfaz del panel administrador poco elegante. La barra de navegación superior no destaca la ruta en la que estás; el menú en desplegable en movil hace que toda la página se desplace hacia abajo; todo es texto: prácticamente no hay iconos ni otras referencias visiuales; no hay estados de carga mientras se obtienen las clases, bloques, o se cargan sus datos; los pocos avisos que existen utilizan diálogos del propio navegador en lugar de personalizados.
- [x] **24. Logotipo del gimnasio** - en public/gym-2d4-logo.jpg está el logo del gimnasio, debería aparecer en la cabecera del admin y en algún lado en las pantallas de la tv.
