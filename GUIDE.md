# Guía del desarrollador — Chronos

> Índice de referencia rápida para moverse por el proyecto sin tener que leer código desde cero.

---

## Si quiero modificar X, voy a Y

| Quiero cambiar…                                      | Archivo/s a editar                                                                                   |
|------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| El texto del botón "Play" o el tagline de la home    | `public/locales/en/common.json` y `public/locales/es/common.json` → clave `home.*`                  |
| Las preguntas de una categoría existente             | `src/data/questions/<nombre-categoria>.json`                                                         |
| Agregar una categoría nueva                          | Ver sección **Cómo agregar una categoría nueva** más abajo                                           |
| El ícono que aparece en cada categoría               | `src/data/catalog.ts` → `CATEGORIES` |
| La imagen de fondo de una categoría                  | `src/data/catalog.ts` → `CATEGORIES` (y poner la imagen en `public/images/`) |
| El ícono o imagen de fondo de una era                | `src/data/catalog.ts` → `ERAS` |
| Los textos del panel de reflexión (títulos, botones) | `public/locales/*/common.json` → claves `reflection.*`                                               |
| Los mensajes de racha (streak)                       | `public/locales/*/common.json` → claves `streak.*`                                                   |
| Los mensajes de resultado final                      | `public/locales/*/common.json` → claves `results.*`                                                  |
| Los mensajes del modo versus / multijugador          | `public/locales/*/common.json` → claves `versus.*` y `home.multiplayerButton`                        |
| El flujo de creación de desafío versus               | `src/pages/multiplayer.tsx`                                                                          |
| Los textos de instalación de la PWA                  | `public/locales/*/common.json` → claves `install.*`                                                  |
| Las traducciones de dificultad (Fácil/Medio/Difícil) | `public/locales/*/common.json` → claves `categories.difficulty.*`                                    |
| Cómo se calculan los puntos de racha                 | `src/hooks/useStreak.ts` → función `registerPlay`                                                    |
| Cómo se guardan las estadísticas                     | `src/hooks/useStats.ts`                                                                              |
| La lógica de la partida individual                   | `src/hooks/useGame.ts`                                                                               |
| La lógica del modo versus (crear/unirse/responder)   | `src/hooks/useMatch.ts`                                                                              |
| El proveedor de autenticación (Supabase)             | `src/context/AuthContext.tsx` y `src/lib/auth.ts`                                                    |
| La pantalla de login (solo se pide para el versus)   | `src/components/LoginScreen.tsx` |
| El logo                                              | `src/components/ChronosLogo.tsx`                                                                     |
| La paleta de colores y animaciones                   | `tailwind.config.ts`                                                                                 |
| Las variables de entorno (URL de Supabase, etc.)     | `.env.local` (no versionado) — ver `src/lib/supabase.ts` para los nombres exactos                   |
| El registro del service worker (PWA)                 | `src/pages/_app.tsx` → efecto al inicio de `App`                                                    |
| Los metadatos del manifest (nombre, tema, íconos)    | `src/pages/_document.tsx` y `public/manifest.json`                                                  |
| Cómo se construye el cliente de Supabase             | `src/lib/supabase.ts`                                                                                |
| El audio (mp3 o voz del navegador)                   | `src/hooks/useNarration.ts` y `src/lib/speech.ts` (`pickEnglishVoice`, `splitSentences`) |
| El glosario de una pregunta (palabras que se traducen al tocar y entran al repaso) | Campo `"vocab"` en el JSON de la pregunta (ver **Cómo agregar vocabulario**) |
| El repaso de palabras al final de la ronda           | `src/lib/vocab.ts` (`buildReview`) y `src/components/VocabReview.tsx` |
| Cuándo una palabra cuenta como aprendida             | `src/lib/words.ts` → `LEARNED_STREAK` |
| La duración de una lección (hoy 5 preguntas)          | `src/hooks/useGame.ts` → `QUESTIONS_PER_ROUND` (y `LESSON_REVIEW_SIZE` en `src/pages/game/[category].tsx` para las palabras del repaso) |
| XP, niveles, meta diaria                             | `src/lib/progress.ts` (constantes `XP_*`, `GOAL_*`, `LEVEL_XP`) |
| Los logros                                           | `src/lib/achievements.ts` + textos en `public/locales/*/common.json` → `achievements.<id>` |
| El repaso diario de palabras y cuándo vuelve una palabra | `src/lib/vocab.ts` (`buildDailyReview`) y `src/lib/words.ts` (`isDue`) |
| Sonidos y vibración                                  | `src/lib/sounds.ts` |
| La bienvenida de la primera vez                      | `src/components/Onboarding.tsx` |
| Los tests                                            | `src/lib/__tests__/` (correr `npm test`) |
| El número de preguntas por ronda                     | `src/hooks/useGame.ts` → constante `QUESTIONS_PER_ROUND`                                            |
| Qué categorías pertenecen a cada era                 | `src/data/catalog.ts` → `ERAS[].categoryIds` |

---

## Páginas

### `src/pages/index.tsx` — Home

Es la pantalla de bienvenida de la aplicación. Muestra el logo grande de Chronos, el tagline localizado, el banner de instalación de la PWA (solo en Android), el estado de la racha del usuario si ya jugó alguna vez, y tres botones: **Jugar** (navega a `/eras`), **Multijugador** (navega a `/multiplayer`, estilo borde dorado con ícono ⚔️) y **Ver Estadísticas** (navega a `/stats`). En la esquina superior tiene el botón de autenticación y el selector de idioma. La página se genera estáticamente con `getStaticProps` para soportar i18n.

### `src/pages/eras.tsx` — Selección de era

Es el primer paso del flujo de juego. Presenta una grilla de cuatro eras históricas (Edad Antigua, Edad Media, Temprano Moderno, Era Moderna), cada una con imagen de fondo, ícono, nombre, rango de años, descripción y conteo de preguntas. Las eras que todavía no tienen preguntas muestran un badge "Próximamente" y al tocarse despliegan un aviso en vez de navegar. Las que sí tienen preguntas llevan al usuario a `/categories?era=<id>`. La lista de eras y qué categorías pertenecen a cada una sale de `ERAS` en `src/data/catalog.ts`. Hoy las cuatro eras tienen preguntas (12 categorías, 30 preguntas cada una): **Edad Antigua** (`ancient-egypt`, `ancient-greece`, `roman-empire`), **Edad Media** (`byzantine-empire`, `crusades-chivalry`, `vikings`), **Temprano Moderno** (`age-of-exploration`, `the-reformation`, `the-renaissance`) y **Era Moderna** (`industrial-revolution`, `world-wars`, `cold-war-space-race`). Las tres de la Era Moderna comparten la imagen `modern-era.jpg` hasta que tengan una propia.

### `src/pages/categories.tsx` — Selección de categoría

Es el segundo paso del flujo de juego individual. Muestra la grilla de categorías disponibles, opcionalmente filtrada por la era que viene en el query param `?era=`. Cada categoría es un `CategoryCard` que al tocarse navega a `/game/<id>`. No contiene ninguna lógica de multijugador; el flujo de desafío versus fue movido completamente a `/multiplayer`. Los datos de categorías se derivan en tiempo de build a partir de las preguntas cargadas desde los JSON.

### `src/pages/multiplayer.tsx` — Crear desafío versus

Flujo de tres pasos para crear una partida multijugador. **Paso 1 (Era):** muestra las eras que ya tienen preguntas (las cuatro eras) con su ícono y nombre. **Paso 2 (Categoría):** filtra las categorías de la era elegida y las muestra como tarjetas. **Paso 3 (Compartir):** crea la partida en Supabase mediante `useMatch`, genera el link de la partida (`/vs/<matchId>`) y presenta dos opciones: compartir por WhatsApp o copiar el link. Si el usuario no está autenticado al seleccionar categoría, llama a `signInWithGoogle()`, que guarda la ruta actual y la página de callback lo devuelve acá al terminar. La navegación hacia atrás es: paso 3 → paso 1, paso 2 → paso 1, paso 1 → `/`. Las eras, categorías e íconos salen del catálogo (`src/data/catalog.ts`).

### `src/pages/game/[category].tsx` — Juego individual

Es la página principal del modo un jugador. Recibe las preguntas de la categoría como prop (pre-renderizadas en build time con `getStaticProps`) y las pasa al hook `useGame`. Controla tres fases: `playing` (muestra `QuestionCard`), `reflecting` (muestra un resumen de la respuesta y el `ReflectionPanel` con contenido educativo), y `finished` (muestra el `StreakDisplay` con el resultado de la racha y la pantalla de resultados `ResultScreen`). Los paths se generan estáticamente por cada combinación de categoría e idioma.

### `src/pages/vs/[matchId].tsx` — Partida versus

Es la página del modo multijugador. Al montar, intenta unirse a la partida con el código de la URL, carga los datos del match y entra en una de seis fases: `loading` (spinner), `lobby` (pantalla de espera con countdown de 2 segundos antes del inicio), `playing`, `reflecting`, `finished` y `error`. Cuando termina, persiste el puntaje en Supabase con `finishMatch` y hace polling cada 5 segundos para saber si el oponente ya terminó. Usa `getServerSideProps` en vez de `getStaticProps` porque el matchId es dinámico y no se conoce en build time.

### `src/pages/stats.tsx` — Estadísticas

Muestra el dashboard completo de rendimiento del jugador. Tiene tres estados: cargando (`stats === null`), vacío (nunca respondió preguntas) y con datos. Cuando hay datos presenta: bloque de racha actual, grilla 2×2 con totales globales (respondidas, precisión, sesiones, sesiones perfectas), barra de correctas vs. incorrectas, desglose por categoría con barra de progreso individual, desglose por dificultad, un bloque de insight que destaca la categoría más fuerte y la más débil, y un botón de reseteo con modal de confirmación y toast de feedback.

### `src/pages/auth/callback.tsx` — Callback de OAuth

Página transitoria que solo se visita automáticamente después de que Google redirige de vuelta a la app. Extrae los tokens del hash de la URL (`access_token` y `refresh_token`), los pasa a `supabase.auth.setSession` para hidratar la sesión en el cliente, y redirige al usuario a la ruta que tenía guardada en `sessionStorage` (o a la home si no había ninguna). Muestra un spinner con texto de estado mientras trabaja.

### `src/pages/_app.tsx` — Wrapper global

Envuelve toda la aplicación con `AuthProvider` y con la configuración de i18n de `next-i18next`. **Ya no hay login obligatorio**: cualquiera puede jugar sin cuenta (el progreso queda en el dispositivo). Google solo se pide para el versus, en `/multiplayer` y `/vs/[matchId]`. También registra el service worker de la PWA en producción.

### `src/pages/_document.tsx` — Document HTML

Configura el `<head>` del HTML generado por Next.js. Incluye el enlace al manifest de la PWA, el meta de `theme-color`, los íconos de la app y los metadatos básicos.

---

## Componentes

### `src/components/ChronosLogo.tsx`

Renderiza el logo de la marca: un ícono SVG dorado con forma de reloj de arena estilizado y el texto "CHRONOS" en tipografía Georgia con espaciado amplio. Acepta una prop `size` (`sm`, `md`, `lg`) que controla tanto el tamaño del SVG como el del texto y si el layout es horizontal (sm) o vertical (md/lg). Es el único componente que no depende de ningún hook ni contexto.

### `src/components/QuestionCard.tsx`

Muestra una pregunta con entre 2 y 4 opciones. El contenido se muestra **siempre en inglés**; la pastilla "ES" muestra el español debajo de la pregunta y de cada opción (red de seguridad). Muestra la dificultad y, si la pregunta lo tiene, el nivel de inglés (`A2`/`B1`/`B2`). Después de responder, la correcta se pone verde, la elegida incorrecta roja y las demás se desvanecen. La imagen de fondo sale de `getCategoryImage` (catálogo).

### `src/components/ReflectionPanel.tsx`

Panel educativo que aparece después de responder. Tiene tres secciones (Contexto histórico, Meanwhile y Reflexión) definidas en el array `PANELS`, todas en inglés con su pastilla "ES". El audio usa `useNarration`: si existe el mp3 (`audio-manifest.json`) suena el mp3 con play/pausa/reinicio; si no, la voz del navegador frase por frase, solo con play/stop; si el dispositivo no tiene voz en inglés, el botón no aparece. Tocar o seleccionar una palabra la lee en voz alta (en inglés, o en español si está en un bloque `lang="es"`). Al final, el botón para seguir.

### `src/components/ResultScreen.tsx`

Pantalla de fin de partida individual. Muestra el logo pequeño, entre 0 y 3 estrellas según el puntaje, el número de respuestas correctas sobre el total con un color que varía según el rendimiento, un badge "¡Perfecto!" si se acertaron todas, un mensaje motivador según el rango del puntaje, y dos botones: "Jugar de nuevo" (reinicia la ronda sin salir de la página) y "Elegir categoría" (navega a `/categories`).

### `src/components/VersusResultScreen.tsx`

Pantalla de fin de partida versus. Muestra dos tarjetas lado a lado, una por jugador, con avatar, nombre, puntaje numérico y estrellas. Si el oponente todavía no terminó, su tarjeta muestra un spinner en vez del puntaje y el banner superior dice "Esperando resultado". Cuando ambos terminaron, el banner anuncia el resultado (ganaste/perdiste/empate). El avatar puede ser la foto del perfil de Google o un fallback de iniciales.

### `src/components/ScoreDisplay.tsx`

Barra de progreso compacta que se muestra en el encabezado del juego. Tiene tres elementos: el contador de pregunta actual sobre el total (siempre visible), una barra de progreso proporcional (oculta en pantallas pequeñas), y el puntaje corriente en dorado. No tiene estado propio; se actualiza con cada render del componente padre.

### `src/components/CategoryCard.tsx`

Botón visual para la grilla de selección de categorías. Tiene imagen de fondo (cuando existe), un gradiente oscuro de abajo hacia arriba para que el texto sea legible, el ícono emoji de la categoría, el nombre localizado, el conteo de preguntas disponibles, y un badge de dificultad que representa la dificultad más frecuente entre las preguntas de esa categoría. La imagen hace un leve zoom al hacer hover.

### `src/components/StreakDisplay.tsx`

Muestra el estado de la racha del jugador en dos contextos distintos, controlados por la prop `context`. En contexto `'home'`: un mensaje de una línea ("Tu racha es de N días" / "Jugaste ayer" / "Perdiste la racha"), oculto si nunca jugó. En contexto `'game_end'`: un badge más prominente que describe el resultado de la sesión que acaba de terminar (primera vez, racha aumentada, nuevo récord, racha reiniciada, ya jugó hoy). No renderiza nada durante SSR para evitar hidratación incorrecta.

### `src/components/StreakBadge.tsx`

Badge inline muy pequeño que muestra el emoji de fuego y el número de días de racha actual. Se usa en la página de estadísticas. Retorna `null` si la racha es 0 o durante SSR.

### `src/components/AuthButton.tsx`

Componente de autenticación del header. Si el estado de auth está cargando, no renderiza nada. Si el usuario está autenticado, muestra `UserMenu` con el nombre, apellido, email y la función de cierre de sesión. Si no está autenticado, muestra un botón con el logo de Google que dispara el flujo OAuth.

### `src/components/UserMenu.tsx`

Menú desplegable del usuario autenticado. El trigger es un pill con un avatar de ícono dorado y el primer nombre. Al abrirse, el dropdown muestra el nombre completo, el email, un acceso a las estadísticas y el botón de cerrar sesión. Se alinea a la izquierda o derecha del trigger según la posición en pantalla para no salirse del viewport. Se cierra al hacer click fuera o al presionar Escape.

### `src/components/LanguageSelector.tsx`

Botón con ícono de globo que abre un dropdown para cambiar entre inglés y español. Al seleccionar un idioma llama a `router.push` con el nuevo locale manteniendo la ruta actual, lo que recarga las traducciones sin perder la navegación. El idioma activo se marca en dorado con un tilde. Se cierra al hacer click fuera o con Escape.

### `src/components/InstallBanner.tsx`

Banner adaptativo para instalar la PWA. Solo se muestra en Android y permanece oculto si la app ya está instalada. En tres variantes: dentro de WhatsApp (muestra un link de intent para abrir Chrome), cuando el navegador tiene el prompt nativo disponible (botón que lo dispara), o cuando no hay prompt nativo (link de texto que abre `InstallInstructionsModal`).

### `src/components/InstallInstructionsModal.tsx`

Bottom sheet con instrucciones manuales de instalación en tres pasos numerados, cuyos textos vienen de las traducciones. El fondo oscurecido es tappable para cerrar el modal. Se abre desde `InstallBanner` cuando el navegador no puede mostrar el prompt nativo.

### `src/components/LoginScreen.tsx`

Pantalla de autenticación que aparece globalmente cuando el usuario no está logueado (la muestra `_app.tsx`). Tiene el logo grande, un tagline, un separador decorativo y un botón de Google OAuth. El fondo es la imagen histórica `home-bg.jpg` con overlays de gradiente y un destello dorado sutil. Al hacer click en el botón, guarda la ruta actual en `sessionStorage` y redirige al flujo de OAuth.

---

## Hooks

### `src/hooks/useGame.ts`

Es el cerebro de la partida individual. Recibe el pool completo de preguntas de la categoría, elige 10 al azar con Fisher-Yates, aleatoriza el orden de las dos opciones, y maneja la máquina de estados del juego (`playing` → `reflecting` → `playing` → … → `finished`). Expone funciones para seleccionar respuesta, avanzar a la siguiente pregunta, terminar el juego y reiniciar la ronda. Dos efectos secundarios: registra cada respuesta en `useStats` cuando entra en la fase `reflecting`, y registra la sesión completa + la racha en `useStats`/`useStreak` cuando llega a `finished`. Usa refs para garantizar que cada registro ocurra exactamente una vez por partida.

### `src/hooks/useMatch.ts`

Provee todas las operaciones asíncronas del modo versus, sin estado local (solo callbacks memoizados). `createMatch` genera un ID alfanumérico de 6 caracteres evitando colisiones y crea las filas en las tablas `matches` y `match_players` de Supabase. `joinMatch` agrega al segundo jugador y pasa la partida a estado `playing`. `submitAnswer` persiste cada respuesta individual en `match_answers` (idempotente ante duplicados). `finishMatch` marca al jugador como terminado y, si todos los jugadores lo están, cierra la partida. `loadMatch` hace tres queries para traer el match, los jugadores con sus perfiles, y todas las respuestas.

### `src/hooks/useStats.ts`

Maneja las estadísticas. **Sin cuenta** se guardan en `localStorage` (`chronos_stats`); **con cuenta** en Supabase (`user_stats`, por `user_id`). Al iniciar sesión, lo del dispositivo se suma a la cuenta una sola vez (`mergeStats`). La lógica pura (sumar respuestas, sesiones, fusionar) está en `src/lib/stats.ts` y tiene tests.

### `src/hooks/useStreak.ts`

Controla la racha de días consecutivos. Igual que `useStats`: sin cuenta en `localStorage` (`chronos_streak`), con cuenta en Supabase (`user_streak`), y al iniciar sesión se fusiona con `mergeStreaks`. La lógica pura está en `src/lib/streak.ts` y las fechas se calculan en **hora local** (`src/lib/dates.ts`): antes se usaba UTC y en Argentina, después de las 21 h, el día ya contaba como el siguiente.

### `src/hooks/useInstallPrompt.ts`

Escucha el evento `beforeinstallprompt` del navegador (Chrome/Edge en Android), lo captura en un ref para usarlo después, y expone `promptInstall()` que muestra el diálogo nativo de instalación. También detecta si la app ya corre en modo standalone (ya instalada), si el usuario está dentro de WhatsApp WebView (donde la instalación directa no es posible), y si el dispositivo es Android. Todos los valores devuelven `false` durante SSR para evitar hidratación incorrecta.

### `src/hooks/useNarration.ts`

Reproduce un texto por vez. `modeFor(mp3Id)` devuelve `'mp3'` si el archivo está en `src/data/audio-manifest.json`, `'voice'` si el dispositivo tiene una voz en inglés, o `null` (sin audio). El manifiesto se genera solo con `scripts/build-audio-manifest.js` antes de `npm run dev` y `npm run build`. Los mp3 vigentes están en `public/audio/v2/`; hoy no hay ninguno, así que se usa la voz del navegador. (Los mp3 anteriores a la reescritura a nivel B1 se borraron; siguen en el historial de git.) Si un mp3 falla al cargar, cae a la voz del navegador. La voz del navegador lee frase por frase (`splitSentences`) para que no se corte en Android.

---

## Cómo agregar preguntas a una categoría existente

1. **Abre el archivo JSON de la categoría** en `src/data/questions/<nombre-categoria>.json` (por ejemplo, `src/data/questions/vikings.json`).

2. **Agrega un nuevo objeto** al final del array, respetando exactamente esta estructura:

```json
{
  "id": "vk-025",
  "category": "vikings",
  "category_label": {
    "en": "Vikings",
    "es": "Vikingos"
  },
  "difficulty": "hard",
  "question": {
    "en": "Which Viking explorer is credited with establishing the first European settlement in North America?",
    "es": "¿A qué explorador vikingo se le atribuye el establecimiento del primer asentamiento europeo en América del Norte?"
  },
  "options": [
    {
      "en": "Leif Erikson",
      "es": "Leif Erikson"
    },
    {
      "en": "Erik the Red",
      "es": "Erik el Rojo"
    }
  ],
  "correctIndex": 0,
  "explanation": {
    "en": "Leif Erikson sailed to a place he called Vinland (modern Newfoundland, Canada) around 1000 AD, nearly 500 years before Columbus reached the Americas.",
    "es": "Leif Erikson navegó a un lugar que llamó Vinlandia (actual Terranova, Canadá) alrededor del año 1000, casi 500 años antes de que Colón llegara a América."
  },
  "meanwhile": {
    "en": "Meanwhile, in China, the Song Dynasty was pioneering movable type printing — an invention that would not reach Europe for another 400 years.",
    "es": "Mientras tanto, en China, la Dinastía Song estaba desarrollando la imprenta de tipos móviles, un invento que no llegaría a Europa hasta 400 años después."
  },
  "reflection": {
    "en": "If Leif Erikson's settlement had been permanent, how might it have changed the course of history for both Europe and the Americas?",
    "es": "Si el asentamiento de Leif Erikson hubiera sido permanente, ¿cómo podría haber cambiado el curso de la historia tanto para Europa como para las Américas?"
  }
}
```

3. **Puntos importantes a cuidar:**
   - El `id` debe ser único en todo el archivo (convención: `<prefijo-categoria>-<número>`).
   - El `category` y `category_label` deben ser **idénticos** a los de las otras preguntas del mismo archivo.
   - `options` puede tener entre 2 y 4 opciones (las 360 preguntas actuales tienen 3). `correctIndex` es la posición de la correcta (0 = la primera). En el juego se mezclan solas.
   - Todas las preguntas actuales tienen `"level"` (`A2` las fáciles, `B1` el resto) y `"vocab"` (ver **Cómo agregar vocabulario**); el test `catalog.test.ts` lo exige.
   - Opcional: `"level": "B1"` (nivel de inglés: `A2`, `B1` o `B2`).
   - El audio es opcional: si no hay mp3, se usa la voz del navegador.
   - Los textos de `explanation`, `meanwhile` y `reflection` deben estar en ambos idiomas.

4. **No hace falta tocar ningún otro archivo.** Las preguntas se importan automáticamente desde `src/data/questions/index.ts` y el conteo por categoría se recalcula en runtime.

---

## Cómo agregar una categoría nueva desde cero

Agregar una categoría requiere modificar varios archivos. Seguí estos pasos en orden.

### Paso 1 — Crear el archivo de preguntas

Crea `src/data/questions/<nueva-categoria>.json` con al menos una pregunta, usando el mismo formato descrito en la sección anterior. Elige un slug en kebab-case para el nombre de archivo y para el campo `category` (por ejemplo, `ottoman-empire`).

### Paso 2 — Registrar el archivo en el índice de preguntas

Abre `src/data/questions/index.ts` y agrega el import y el spread:

```ts
import ottomanEmpire from './ottoman-empire.json';

const questionsData = [
  ...ancientEgypt,
  // ... otras categorías
  ...ottomanEmpire,  // ← agregar acá
];
```

### Paso 3 — Registrar la categoría en el catálogo

Todo está en un solo archivo, `src/data/catalog.ts`:

```ts
// En CATEGORIES:
'ottoman-empire': { id: 'ottoman-empire', icon: '🌙', image: '/images/ottoman-empire.jpg' },

// En ERAS, dentro de la era que corresponda:
{ id: 'middle-ages', icon: '⚜️', image: '/images/middle-ages.jpg',
  categoryIds: ['byzantine-empire', 'crusades-chivalry', 'vikings', 'ottoman-empire'] },
```

Y poner la imagen en `public/images/ottoman-empire.jpg`. El test `catalog.test.ts` avisa si falta la imagen o si una pregunta usa una categoría que no está en el catálogo.

### Paso 5 — Agregar traducciones de nombre

El nombre de la categoría que se muestra en la UI viene del campo `category_label` de las preguntas (ya bilingüe en el JSON), así que no hace falta tocar los archivos de locale para el nombre de la categoría en sí.

Sin embargo, **si la era también es nueva** (no existe todavía en la app), sí hay que agregar sus traducciones en ambos archivos de locale:

```json
// public/locales/en/common.json
"eras": {
  "ottoman-era": {
    "name": "Ottoman Era",
    "years": "1300 – 1900 AD",
    "description": "The Ottoman Empire shaped three continents for six centuries."
  }
}

// public/locales/es/common.json
"eras": {
  "ottoman-era": {
    "name": "Era Otomana",
    "years": "1300 – 1900 d.C.",
    "description": "El Imperio Otomano moldeó tres continentes durante seis siglos."
  }
}
```

### Paso 6 — Audio (opcional)

No hace falta generar mp3: si una pregunta no tiene, se lee con la voz del navegador. Si algún día querés generarlos, `node scripts/generate-audio.js` crea los de todas las preguntas en `public/audio/v2/` (`{id}_{explanation|meanwhile|reflection}_en.mp3`, unos 125 KB cada uno; con 360 preguntas serían unos 135 MB, así que conviene generar solo los de las historias más importantes pasando sus ids: `node scripts/generate-audio.js gr-006 gr-007`).

---

## Cómo agregar vocabulario a una pregunta

Cada pregunta puede traer un glosario de 3 a 5 palabras clave:

```json
"vocab": [
  { "term": "shipwreck", "es": "naufragio" },
  { "term": "seabed", "es": "fondo del mar" }
]
```

- `term` tiene que aparecer **tal cual** (palabra completa, sin importar mayúsculas) en la pregunta, `explanation`, `meanwhile` o `reflection` en inglés. El test `vocab.test.ts` lo verifica.
- En el juego esas palabras salen con subrayado punteado: al tocarlas se leen y se ve la traducción.
- Al terminar la ronda se arma un repaso de hasta 5 palabras (las tocadas primero, luego las falladas antes, luego las nuevas) con tarjetas de "¿qué significa?" y "completá la frase". Las opciones incorrectas salen de otras palabras del glosario, así que hacen falta al menos 3 palabras en total.
- El progreso se guarda en el dispositivo (`chronos_words`). Una palabra cuenta como aprendida con 2 aciertos seguidos.

## Progreso, meta diaria y logros

Todo se guarda en el dispositivo (clave `chronos_progress`; todavía no se sincroniza con la cuenta de Google). `src/hooks/useProgress.ts` mantiene un único estado compartido por toda la app, así que lo que registra el juego se ve enseguida en la home, en `/progress` y en las tarjetas de categoría.

- **Lección:** 5 preguntas. `buildRound` elige primero las que el jugador nunca vio, después las que falló y al final el resto, así una categoría se recorre completa antes de repetir. Al terminar hay un repaso de 3 palabras.
- **XP:** 10 por respuesta correcta, 2 por incorrecta, 20 por terminar la lección (+10 si es perfecta), 5 por palabra acertada en un repaso y 30 de bono por cumplir la meta diaria.
- **Meta diaria:** 1 lección + repasar 5 palabras. Los contadores se reinician cada día (hora local).
- **Niveles:** 10 niveles con título (`level.title.N`) y después uno cada 800 XP.
- **Páginas:** `/words` (mis palabras y repaso diario con repetición espaciada: vuelven a 1, 3, 7 y 14 días según los aciertos seguidos) y `/progress` (nivel, estadísticas y logros).
- **Sonidos:** se generan con la Web Audio API, sin archivos, y se pueden silenciar desde el botón 🔊.

## Tests

```bash
npm test          # corre todo una vez
npm run test:watch
```

Están en `src/lib/__tests__/` y cubren la lógica pura: rachas y fechas locales, estadísticas y su fusión al iniciar sesión, armado de rondas, pregunta del día, división en frases y la consistencia del contenido (ids únicos, 2–4 opciones, categorías e imágenes existentes, historias existentes).

## Seguridad en Supabase

`supabase/migrations/002_secure_user_progress.sql` deja que cada usuario vea y modifique solo su progreso. `003_secure_versus.sql` cierra tres huecos del versus: el amigo no podía actualizar el estado de la partida, un tercero podía sumarse a una partida llena y los perfiles se leían sin cuenta.
