# Contexto del Proyecto: 2D4 Gym TV

## 1. Visión General

**2D4 Gym TV** es una aplicación web diseñada para gimnasios tipo boutique/CrossFit. Su objetivo principal es permitir a los entrenadores planificar clases por adelantado y utilizarlas para proyectar rutinas, ejercicios y temporizadores en las pantallas (TVs) del gimnasio en tiempo real.

La aplicación se divide lógicamente en dos interfaces bajo el mismo proyecto:

1. **El Panel de Administración (`/admin`):** Usado por el entrenador en un móvil/tablet. Permite el CRUD de bloques y clases, y actúa como el "mando a distancia" (Live Remote) para controlar lo que sale en la televisión (Play, Pausa, Siguiente Bloque).
2. **La Pantalla de la TV (`/tv/:id`):** Una vista "tonta" de solo lectura, diseñada como una "10-foot UI" (interfaz para ser vista desde lejos). Solo escucha los cambios en la base de datos y renderiza la vista correspondiente.

## 2. Stack Tecnológico

- **Frontend:** Vue 3 (Composition API + `<script setup>`), Vite.
- **Estado y Enrutamiento:** Pinia, Vue Router.
- **Estilos:** Tailwind CSS (diseño Utility-First, sin CSS personalizado a menos que sea estrictamente necesario).
- **Backend / Base de Datos:** Firebase (Firestore para la base de datos en tiempo real y Auth para la autenticación del admin).

## 3. Reglas de Diseño (10-foot UI)

La interfaz de la TV debe ser extrema y brutalmente limpia. Los alumnos están moviéndose y sudando; no debe haber distracciones.

- **Colores Core:**
- Fondo: Negro (`bg-[#0A0A0A]`) para evitar deslumbrar.
- Principal/Acción: Naranja vivo (`text-[#FB6537]`, `bg-[#FB6537]`).
- Descanso/Recuperación: Cian (`text-[#06B6D4]`).

- **Tipografía:** Gigante, condensada, en mayúsculas y muy gruesa (`font-black`, `uppercase`, `tracking-tighter`).
- **Psicología de Formas (Estricto):**
- **Repeticiones:** Siempre van dentro de un cuadrado naranja con bordes redondeados (ej. `[ 15 ]`).
- **Segundos/Tiempo:** Siempre van dentro de un círculo naranja hueco (ej. `( 30s )`).

## 4. Arquitectura de Datos y Layout en TV (La Regla del 30/70)

Hemos unificado la infinidad de tipos de entrenamiento (AMRAP, EMOM, Tabata, For Time) en **dos familias principales**, que comparten un layout estricto de pantalla dividida en la TV: **30% Izquierda (Controlador) / 70% Derecha (Acción)**. Abajo a la derecha siempre hay una "Píldora" para información extra.

### Familia A: Por Tiempo (El Reloj manda)

El tiempo límite define el bloque. El reloj va hacia atrás.

- **Layout:**
- **Izquierda (30%):** Cronómetro gigante regresivo (`00:00`) y Título del bloque/ronda.
- **Derecha (70%):** \* _Si es AMRAP:_ Lista completa de ejercicios.
- _Si es EMOM/Intervalo:_ Un único ejercicio en tamaño colosal.

- **Píldora (Abajo derecha):** Muestra el "Siguiente ejercicio".

### Familia B: Por Repeticiones (El Alumno manda)

Las repeticiones definen el bloque. El alumno va a su ritmo. El reloj va hacia adelante (Stopwatch).

- **Layout:**
- **Izquierda (30%):** Instrucciones de la ronda (Ej. "4 SERIES" o "ESQUEMA: 21-15-9").
- **Derecha (70%):** Siempre muestra la lista completa de ejercicios con sus respectivos cuadrados de repeticiones.
- **Píldora (Abajo derecha):** Cronómetro progresivo de tiempo transcurrido.

## 5. El Motor del Cronómetro (Sincronización Firebase)

**REGLA CRÍTICA:** Nunca, bajo ninguna circunstancia, se guarda el "tiempo restante" en Firestore (ej. guardar 10:59, 10:58...). Esto saturaría la base de datos y causaría desincronización por lag.

- **La solución:** Cuando el admin le da al "Play", Firebase guarda un `timestamp_inicio` (hora del servidor) y el `estado_reloj` pasa a `"corriendo"`.
- La TV lee ese `timestamp_inicio` una sola vez y usa `requestAnimationFrame` en el frontend para calcular localmente: `Tiempo Transcurrido = (Hora Actual - timestamp_inicio) + tiempo_acumulado`.
- Si se pausa, el admin calcula el tiempo transcurrido, lo suma a `tiempo_acumulado` y pone el `timestamp_inicio` a `null`.
