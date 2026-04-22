# Guía del desarrollador — Chronos

> Índice de referencia rápida para moverse por el proyecto sin tener que leer código desde cero.

---

## Si quiero modificar X, voy a Y

| Quiero cambiar…                                      | Archivo/s a editar                                                                                   |
|------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| El texto del botón "Play" o el tagline de la home    | `public/locales/en/common.json` y `public/locales/es/common.json` → clave `home.*`                  |
| Las preguntas de una categoría existente             | `src/data/questions/<nombre-categoria>.json`                                                         |
| Agregar una categoría nueva                          | Ver sección **Cómo agregar una categoría nueva** más abajo                                           |
| El ícono que aparece en cada categoría               | `src/components/CategoryCard.tsx` → objeto `CATEGORY_ICONS`                                         |
| La imagen de fondo de una categoría                  | `src/components/CategoryCard.tsx` → objeto `CATEGORY_IMAGES` (y poner la imagen en `public/images/`)|
| El ícono o imagen de fondo de una era                | `src/pages/eras.tsx` → `ERA_IMAGES` y `ERA_DEFS`                                                    |
| Los textos del panel de reflexión (títulos, botones) | `public/locales/*/common.json` → claves `reflection.*`                                               |
| Los mensajes de racha (streak)                       | `public/locales/*/common.json` → claves `streak.*`                                                   |
| Los mensajes de resultado final                      | `public/locales/*/common.json` → claves `results.*`                                                  |
| Los mensajes del modo versus                         | `public/locales/*/common.json` → claves `versus.*`                                                   |
| Los textos de instalación de la PWA                  | `public/locales/*/common.json` → claves `install.*`                                                  |
| Las traducciones de dificultad (Fácil/Medio/Difícil) | `public/locales/*/common.json` → claves `categories.difficulty.*`                                    |
| Cómo se calculan los puntos de racha                 | `src/hooks/useStreak.ts` → función `registerPlay`                                                    |
| Cómo se guardan las estadísticas                     | `src/hooks/useStats.ts`                                                                              |
| La lógica de la partida individual                   | `src/hooks/useGame.ts`                                                                               |
| La lógica del modo versus (crear/unirse/responder)   | `src/hooks/useMatch.ts`                                                                              |
| El proveedor de autenticación (Supabase)             | `src/context/AuthContext.tsx` y `src/lib/auth.ts`                                                    |
| La pantalla de login                                 | `src/components/LoginScreen.tsx`                                                                     |
| El logo                                              | `src/components/ChronosLogo.tsx`                                                                     |
| La paleta de colores y animaciones                   | `tailwind.config.ts`                                                                                 |
| Las variables de entorno (URL de Supabase, etc.)     | `.env.local` (no versionado) — ver `src/lib/supabase.ts` para los nombres exactos                   |
| El registro del service worker (PWA)                 | `src/pages/_app.tsx` → efecto al inicio de `App`                                                    |
| Los metadatos del manifest (nombre, tema, íconos)    | `src/pages/_document.tsx` y `public/manifest.json`                                                  |
| Cómo se construye el cliente de Supabase             | `src/lib/supabase.ts`                                                                                |
| La selección de voz para texto-a-voz                 | `src/hooks/useTextToSpeech.ts` → funciones `pickBestVoice` y `LANG_PREFS`                           |
| El número de preguntas por ronda                     | `src/hooks/useGame.ts` → constante `QUESTIONS_PER_ROUND`                                            |
| Qué categorías pertenecen a cada era                 | `src/pages/eras.tsx` → `ERA_DEFS` y `src/pages/categories.tsx` → `ERA_CATEGORIES`                  |

---

## Páginas

### `src/pages/index.tsx` — Home

Es la pantalla de bienvenida de la aplicación. Muestra el logo grande de Chronos, el tagline localizado, el banner de instalación de la PWA (solo en Android), el estado de la racha del usuario si ya jugó alguna vez, y dos botones: uno para empezar a jugar (navega a `/eras`) y otro para ver las estadísticas. En la esquina superior tiene el botón de autenticación y el selector de idioma. La página se genera estáticamente con `getStaticProps` para soportar i18n.

### `src/pages/eras.tsx` — Selección de era

Es el primer paso del flujo de juego. Presenta una grilla de cuatro eras históricas (Edad Antigua, Edad Media, Temprano Moderno, Era Moderna), cada una con imagen de fondo, ícono, nombre, rango de años, descripción y conteo de preguntas. Las eras que todavía no tienen preguntas muestran un badge "Próximamente" y al tocarse despliegan un aviso en vez de navegar. Las que sí tienen preguntas llevan al usuario a `/categories?era=<id>`. La lista de eras y qué categorías pertenecen a cada una está hardcodeada en el objeto `ERA_DEFS` del mismo archivo.

### `src/pages/categories.tsx` — Selección de categoría

Es el segundo paso del flujo de juego. Muestra la grilla de categorías disponibles, opcionalmente filtrada por la era que viene en el query param `?era=`. Para cada categoría hay dos elementos: la tarjeta que lleva al juego individual (`/game/<id>`) y un botón "Desafiar a un amigo" que crea una partida versus en Supabase, genera el link compartible y muestra un modal para copiarlo. Si el usuario no está autenticado al intentar desafiar, lo redirige al flujo de Google OAuth. Los datos de categorías se derivan en tiempo de build a partir de las preguntas cargadas desde los JSON.

### `src/pages/game/[category].tsx` — Juego individual

Es la página principal del modo un jugador. Recibe las preguntas de la categoría como prop (pre-renderizadas en build time con `getStaticProps`) y las pasa al hook `useGame`. Controla tres fases: `playing` (muestra `QuestionCard`), `reflecting` (muestra un resumen de la respuesta y el `ReflectionPanel` con contenido educativo), y `finished` (muestra el `StreakDisplay` con el resultado de la racha y la pantalla de resultados `ResultScreen`). Los paths se generan estáticamente por cada combinación de categoría e idioma.

### `src/pages/vs/[matchId].tsx` — Partida versus

Es la página del modo multijugador. Al montar, intenta unirse a la partida con el código de la URL, carga los datos del match y entra en una de seis fases: `loading` (spinner), `lobby` (pantalla de espera con countdown de 2 segundos antes del inicio), `playing`, `reflecting`, `finished` y `error`. Cuando termina, persiste el puntaje en Supabase con `finishMatch` y hace polling cada 5 segundos para saber si el oponente ya terminó. Usa `getServerSideProps` en vez de `getStaticProps` porque el matchId es dinámico y no se conoce en build time.

### `src/pages/stats.tsx` — Estadísticas

Muestra el dashboard completo de rendimiento del jugador. Tiene tres estados: cargando (`stats === null`), vacío (nunca respondió preguntas) y con datos. Cuando hay datos presenta: bloque de racha actual, grilla 2×2 con totales globales (respondidas, precisión, sesiones, sesiones perfectas), barra de correctas vs. incorrectas, desglose por categoría con barra de progreso individual, desglose por dificultad, un bloque de insight que destaca la categoría más fuerte y la más débil, y un botón de reseteo con modal de confirmación y toast de feedback.

### `src/pages/auth/callback.tsx` — Callback de OAuth

Página transitoria que solo se visita automáticamente después de que Google redirige de vuelta a la app. Extrae los tokens del hash de la URL (`access_token` y `refresh_token`), los pasa a `supabase.auth.setSession` para hidratar la sesión en el cliente, y redirige al usuario a la ruta que tenía guardada en `sessionStorage` (o a la home si no había ninguna). Muestra un spinner con texto de estado mientras trabaja.

### `src/pages/_app.tsx` — Wrapper global

Envuelve toda la aplicación con `AuthProvider` y con la configuración de i18n de `next-i18next`. Contiene la lógica de auth guard: mientras carga el estado de autenticación muestra un fondo vacío para evitar flicker; si el usuario no está autenticado muestra `LoginScreen` en lugar de la página solicitada (excepto en `/auth/callback`, que siempre se renderiza tal cual). También registra el service worker de la PWA en producción.

### `src/pages/_document.tsx` — Document HTML

Configura el `<head>` del HTML generado por Next.js. Incluye el enlace al manifest de la PWA, el meta de `theme-color`, los íconos de la app y los metadatos básicos.

---

## Componentes

### `src/components/ChronosLogo.tsx`

Renderiza el logo de la marca: un ícono SVG dorado con forma de reloj de arena estilizado y el texto "CHRONOS" en tipografía Georgia con espaciado amplio. Acepta una prop `size` (`sm`, `md`, `lg`) que controla tanto el tamaño del SVG como el del texto y si el layout es horizontal (sm) o vertical (md/lg). Es el único componente que no depende de ningún hook ni contexto.

### `src/components/QuestionCard.tsx`

Muestra una sola pregunta con sus dos opciones de respuesta. Antes de responder, los botones son interactivos. Después de responder, el componente pasa a modo "respondido": la opción correcta se pone verde, la seleccionada incorrecta se pone roja, las demás se desvanecen, y aparece un banner de feedback (correcto/incorrecto). Si la categoría tiene imagen de fondo registrada en `CATEGORY_IMAGES`, se muestra como fondo con un overlay oscuro para que el texto sea legible. No maneja estado propio: todo le llega por props.

### `src/components/ReflectionPanel.tsx`

Es el panel educativo que aparece después de responder una pregunta. Tiene tres secciones expandibles: Contexto Histórico (la explicación de la respuesta correcta), Mientras tanto (qué ocurría en el resto del mundo en ese momento), y Reflexión (una pregunta abierta para pensar). Cada sección tiene un botón de texto-a-voz que usa `useTextToSpeech`; el audio se detiene automáticamente cuando cambia la pregunta o cuando el componente se desmonta. Al final hay un botón que dice "Continuar" o "Terminar" dependiendo de si es la última pregunta.

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

Maneja las estadísticas de rendimiento persistidas en Supabase. Carga los datos al montar según el usuario autenticado (por `user_id`) o por dispositivo anónimo (por `device_id`). Mantiene un `ref` sincronizado con el estado para que `recordAnswer` y `recordSessionEnd` siempre lean los valores más actuales sin necesitar ser recreados en cada render. `recordAnswer` actualiza los contadores globales, por categoría y por dificultad, y persiste inmediatamente. `recordSessionEnd` actualiza las sesiones completadas, las sesiones perfectas y el mejor puntaje histórico. También expone utilidades para calcular precisión global, por categoría y por dificultad, y para identificar la categoría más fuerte y más débil (con mínimo de 5 respuestas).

### `src/hooks/useStreak.ts`

Controla la racha de días consecutivos de juego. Al igual que `useStats`, persiste en Supabase y funciona tanto con usuario autenticado como anónimo. `registerPlay` se llama al terminar una partida: compara la fecha de hoy con `lastPlayedDate` y decide si incrementar la racha, reiniciarla desde 1 (si pasó más de un día) o no hacer nada (si ya jugó hoy). Devuelve un `PlayResult` que describe el resultado para que los componentes puedan mostrar el mensaje correcto. `getStreakStatus` es una función de solo lectura (no muta estado) que devuelve `'never_played'`, `'active_today'`, `'active_yesterday'` o `'lost'`.

### `src/hooks/useInstallPrompt.ts`

Escucha el evento `beforeinstallprompt` del navegador (Chrome/Edge en Android), lo captura en un ref para usarlo después, y expone `promptInstall()` que muestra el diálogo nativo de instalación. También detecta si la app ya corre en modo standalone (ya instalada), si el usuario está dentro de WhatsApp WebView (donde la instalación directa no es posible), y si el dispositivo es Android. Todos los valores devuelven `false` durante SSR para evitar hidratación incorrecta.

### `src/hooks/useTextToSpeech.ts`

Integra la Web Speech API para leer en voz alta el contenido del panel de reflexión. Al llamar `speak(texto, id)`, busca la mejor voz disponible para el locale activo (priorizando voces neurales/premium sobre las estándar), configura velocidad y tono, y reproduce. Si se llama con el mismo `id` que ya está reproduciéndose, funciona como toggle y detiene el audio. El hook está deshabilitado en Android (`isSupported: false`) por la inconsistencia de la implementación TTS en esa plataforma. El audio se cancela automáticamente al desmontar el componente que use el hook.

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
   - `correctIndex` es `0` si la primera opción es la correcta, o `1` si es la segunda. Al tener solo dos opciones, una pregunta bien formada siempre tiene un `correctIndex` de 0 o 1.
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

### Paso 3 — Asociar la categoría a una era

Hay dos objetos que mapean categorías a eras, uno en cada archivo:

- `src/pages/eras.tsx` → `ERA_DEFS`: agregar el slug al `categoryIds` de la era correspondiente.
- `src/pages/categories.tsx` → `ERA_CATEGORIES`: agregar el slug al array de la misma era.

```ts
// En ERA_DEFS (eras.tsx):
{ id: 'middle-ages', icon: '⚜️', categoryIds: ['byzantine-empire', 'crusades-chivalry', 'vikings', 'ottoman-empire'] }

// En ERA_CATEGORIES (categories.tsx):
'middle-ages': ['byzantine-empire', 'crusades-chivalry', 'vikings', 'ottoman-empire']
```

### Paso 4 — Agregar ícono y imagen de fondo

**Ícono emoji** — Aparece en la tarjeta de categoría y en la página de estadísticas. Agregar la entrada en tres lugares:

- `src/components/CategoryCard.tsx` → objeto `CATEGORY_ICONS`
- `src/pages/stats.tsx` → objeto `CATEGORY_ICONS`
- `src/pages/eras.tsx` — el ícono de la era no cambia, pero si la era es nueva sí habría que agregarlo en `ERA_DEFS`.

```ts
'ottoman-empire': '🌙',
```

**Imagen de fondo** — Aparece en la tarjeta y en el fondo del juego. Agregar en:

- `src/components/CategoryCard.tsx` → objeto `CATEGORY_IMAGES`
- `src/components/QuestionCard.tsx` → objeto `CATEGORY_IMAGES`
- `src/pages/game/[category].tsx` → objeto `CATEGORY_IMAGES`
- `src/pages/vs/[matchId].tsx` → objeto `CATEGORY_IMAGES`
- Colocar la imagen en `public/images/ottoman-empire.jpg` (misma convención de nombre).

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

### Paso 6 — Verificar el build

Correr `npm run build` para que Next.js regenere los paths estáticos de `/game/[category]`. Si hay errores de TypeScript relacionados con el nuevo slug, verificar que el campo `category` en el JSON coincida exactamente con el slug registrado en los pasos anteriores.

---

> **Resumen de archivos tocados al agregar una categoría nueva:**
> `src/data/questions/<slug>.json` (nuevo) ·
> `src/data/questions/index.ts` ·
> `src/pages/eras.tsx` ·
> `src/pages/categories.tsx` ·
> `src/components/CategoryCard.tsx` ·
> `src/components/QuestionCard.tsx` ·
> `src/pages/game/[category].tsx` ·
> `src/pages/vs/[matchId].tsx` ·
> `src/pages/stats.tsx` ·
> `public/images/<slug>.jpg` (imagen nueva) ·
> `public/locales/*/common.json` (solo si la era también es nueva)
