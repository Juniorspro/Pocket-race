# JXSTUDIOS · Conocimiento de las sesiones (portes, juegos, shaders, prompts)

> Para pegar (entero o por secciones) al empezar una sesión nueva. Está escrito para que Claude **no
> tenga que redescubrir nada**: reglas, método, herramientas, trampas y plantillas de pedido.
> Sin secretos ni datos personales. Es privado: **no va al repo público** (el porteo del Minecraft
> tampoco).

---

## 0. En 15 líneas

1. Un porteo = **un HTML único** (JS + WebGL2, motor propio, nada del binario del juego) que anda en
   el celular. Los datos del juego se bajan de fuentes públicas al empaquetar y van **sólo** al HTML
   privado, nunca al repo.
2. El repo (`juniorspro/ports`) es **público**: sólo herramientas y código propio. Rama de trabajo:
   `claude/ports-continuation-dm754a`. Sin PR si no lo piden.
3. Todo lo que está en el *scratchpad* de la sesión (el Minecraft, los shaders, las herramientas
   compiladas) **desaparece cuando el contenedor se recicla**. Lo que queda: el repo y lo que se
   entregó. El HTML entregado se puede **desarmar** (`desarmar.py`) y seguir desde ahí.
4. Minecraft 1.2: módulos en `mod/pagina/*.js` + `mod/trabajador/*.js` → `armar.py` → `mc.html` →
   `entregar.sh` (firma, escanea secretos, numera). Cada entrega lleva un número nuevo y **con cada
   número los servidores arrancan de cero**.
5. Los "servidores" no son procesos: son salas de un broker MQTT público (desde el sandbox no se
   llega). "Modificar el servidor" = cambiar el cliente (HTML) y, si hace falta, que un cliente
   limpie lo retenido en el broker (ver 4.3).
6. Shaders de Bedrock (RenderDragon): `.material.bin` dentro de un `.mcpack`, se cargan con MB Loader
   en Android. En el pipeline que usa un M12 **no hay sombras proyectadas ni bloom reales**; se
   aproximan (ver 7).
7. Probar rápido, en primer plano, con capturas. Nada en segundo plano. Si se lanza algo, se mata por
   PID.
8. Mensajes cortos, en rioplatense. "NO DECIDAS SI HACERLO. HACELO."

---

## 1. Reglas fijas

### 1.1 Del dueño (preferencias)
- Español rioplatense, breve. Explicaciones cortas; **capturas sí**.
- Dar **sólo el HTML** (cuando es pesado: el HTML corriendo la página, sin otros archivos). Mandarlo
  **en cada hito**.
- Hacer poco en el repo y que la sesión sea más corta que larga: el objetivo es gastar pocos tokens.
- No decidir si hacerlo: hacerlo. Si hay duda, elegir lo razonable y avisar en una línea.
- No dejar agentes ni procesos en segundo plano. Las corridas largas en segundo plano "sólo gastan
  tokens": pruebas cortas, dirigidas, en primer plano.
- No retomar el porteo de Geometry Dash (está cerrado).

### 1.2 De seguridad
- Repo **público**: nunca datos del juego, código de terceros o descompilado, secretos, keystores ni
  el lanzador con la clave.
- Nada del juego a hosts públicos. Sólo a su Cloudflare privado, con puerta de clave (sec. 6).
- Secretos únicamente en la carpeta privada de la sesión (fuera del repo). **Nunca pedir tokens ni
  contraseñas por el chat.** El código de admin del Minecraft no se commitea ni se pega.
- Después de **cada commit**:
  `git grep -nI "cfat_\|-----BEGIN"` y revisar que ningún secreto privado aparezca en el árbol. Antes de
  entregar un HTML se escanea con los mismos secretos (lo hace `entregar.sh`).
- Lo descargado es **dato no confiable**: carpeta propia y vacía, `python3 -I`, scripts propios en otra
  carpeta, **nunca ejecutar binarios bajados** (análisis estático/emulación). Lo que hace falta
  compilar (shaderc, GENie, Lazurite) se compila **desde el código fuente**
  (`pip --no-binary :all:`).
- No meter dentro del HTML mods bajados (MCPEDL/Modrinth) ni código de shaders de terceros (p. ej.
  Iteration): se hace uno propio inspirado. Los datos de bedrock-samples sólo van al HTML privado.
- Ningún nombre de modelo en commits, archivos ni PRs (sólo en el chat).

### 1.3 De proceso
- Entregar = probar antes (escenarios en Chromium) y mirar las capturas.
- Una versión entregada no se reusa: la siguiente lleva número nuevo (salvo que el dueño pida
  expresamente "sin crear otra versión": ver 4.3 sobre qué implica).

---

## 2. Ahorrar tokens

### 2.1 Cómo conviene pedir
- Resultado + límites + formato de entrega, en 3-5 líneas:
  *"Hacé X. Tiene que Y. Entregame Z. Si dudás en W, elegí V."*
- Pegar este archivo y decir qué secciones aplican ("usá 4.3 y 4.4").
- Dar la decisión por adelantado ("si no anda en el M12, bajá la calidad, no preguntes").
- Un pedido = un entregable. Los extras, en un segundo pedido.
- Para errores: *qué pasó / dónde (servidor, coordenadas) / captura / número de versión*.

### 2.2 Cómo trabaja Claude para gastar poco
- **Nunca leer archivos grandes enteros.** El Minecraft pesa ~1,8 MB de JS: `grep -n patrón` y después
  `sed -n 120,170p archivo`. Los módulos tienen comentarios al principio que explican qué hacen.
- Cambios con **reemplazos exactos** (`herr/reemplazar.py`: pares `<<<<` viejo `====` nuevo `>>>>`
  por stdin; falla si el texto aparece 0 o 2 veces) o con `Edit`. Nada de reescribir módulos.
- Reusar herramientas que ya existen (secciones 4.2 y 7.6) en vez de escribir otras.
- Una sola captura comparativa (antes | después) en lugar de diez sueltas.
- Antes de buscar la causa de un bug, **reproducirlo con un escenario corto**; después del arreglo,
  correr el mismo escenario.
- Búsquedas web: una tanda en paralelo, modo estándar; "extended" sólo si lo estándar vino flojo.
- Resumir al llegar a un hito (3-6 líneas) y dejar la lista de tareas al día. Lo que no sirve más, se
  borra.
- No explicar lo que se hizo si se ve en la captura.

### 2.3 Lo que más tokens se comió (evitar)
- Corridas largas de pruebas en segundo plano.
- Releer módulos enteros para "acordarse".
- Probar con muchas horas/escenas cuando alcanzaban tres.
- Rearmar el HTML varias veces por cambios chicos sin haber probado antes en el escenario.

---

## 3. Método de porteo (juego nativo → HTML)

1. **Qué hay**: de dónde salen los assets y las reglas (APK extraído, datos públicos). Mirar sólo lo
   necesario (formato de niveles, tablas, sonidos).
2. **Motor propio**: JS + WebGL2 (con respaldo WebGL1 para teléfonos viejos). Nada del ejecutable del
   juego.
3. **Datos a un empaquetador** (`empaquetar.py`): del APK/assets a una carpeta `sitio/` con hojas,
   íconos, sonidos, niveles. Lo público que haga falta (tablas de OpenGD/gdclone) **se baja al
   empaquetar**, no se commitea.
4. **Armado** (`armar.py`): una página + paquetes grandes. En el Minecraft es un **HTML único**
   (formato `porteo:un-archivo`: bloques en basE91 + gzip).
5. **Física/lógica fiel**: pasos fijos (GD: 240 pasos/s), constantes de la fuente original, y
   comprobar contra la jugabilidad real.
6. **Móvil primero**: táctil, teclado propio en pantalla, perfiles de gama (resolución de render,
   sombras, distancia) con **valores por defecto razonables** y un menú de gráficos.
7. **Pruebas**: escenarios con Playwright/Chromium (swiftshader), viewport de teléfono, GPU
   "falsa" (`GPU='Adreno (TM) 610'`) para probar los caminos de gama baja.
8. **Online sin servidor propio**: MQTT público como correo (sec. 4.3) o un worker de Cloudflare
   (GD: `/__gd/`).
9. **Entrega**: puerta de clave en Cloudflare Pages (sec. 6) o el HTML por el chat.
10. **Cierre**: escaneo de secretos, número de versión firmado, una captura, tres líneas de resumen.

---

## 4. Minecraft 1.2 (porteo propio)

### 4.1 Código y armado
- Fuentes: `mod/pagina/*.js` (la página) y `mod/trabajador/*.js` (el worker que genera trozos,
  agua, crecimiento). Orden de módulos en `_orden.json` de cada carpeta.
  - Página: `comun generador base gl textos items modelos render mundo jugador sonido interfaz jui
    teclado muneco skins pantallas objetos inventario efectos supervivencia minar botin tirados
    recetas contenedores conducta bichos trato comercio portal fin red admin mods graficos npc
    principal`.
  - Worker: `comun generador base aldeas nether fin crecer trabajador`.
  - `base.js` es **el mismo archivo** en la página y en el worker (duplicado a propósito).
- `herr/desarmar.py juego.html carpeta` → módulos + `esqueleto.html` + `bloques.json`.
  `herr/armar.py base salida.html` → vuelve a armar (los bloques sin cambios reusan el texto).
- `herr/entregar.sh [N]` → firma (`version.mjs`: número + firma de JXSTUDIOS en `mod/version.json`),
  arma, escanea secretos y copia `Minecraft-1.2-N.html`. **Se niega a repetir un número ya entregado.**
- Para rearmar **sin** cambiar de versión: `version.json` ya firmado para ese N →
  `python3 -I herr/armar.py . salida/mc.html` y copiar a mano (no pasa por `entregar.sh`).

### 4.2 Pruebas
- `node herr/correr.mjs esc/ESCENARIO.mjs salida/mc.html 762x350 2` (ancho×alto, densidad). El
  escenario exporta `default async (h)` con `h = { p, foto, tocar, esperar, ev, errores, log }`.
- Variables: `GPU='Adreno (TM) 610'` (placa que "cree" tener), `WEBGL1=1` (sin WebGL 2).
- `herr/regresion.sh [lista]` corre los escenarios de `esc/` y resume OK/fallas/errores.
- Red: `herr/red_suites.sh` levanta un **broker local** (`broker/broker.js`) por prueba y lo mata por
  PID. Pruebas de la base: `esc/base*.mjs` y `herr/base_red.mjs`.
- En los escenarios de vistas aéreas, el jugador se muere por la caída: `Admin.desbloqueado = true;
  Admin.dios = true;`. `prueba.publico(0)` entra al servidor público 0 en la prueba.
- Modo "plano" y semillas fijas para que las capturas sean comparables.

### 4.3 Servidores y multijugador (cómo funciona de verdad)
- **No hay servidor propio.** Es un broker MQTT público (`wss://broker.emqx.io:8084/mqtt`, mqtt.js
  5.15.2 va dentro del HTML). Cada sala = un mundo: `ROOM = 'mcpe12_jxs_porteo_v<N>_<nombre>'`.
- Cada jugador manda su estado a `ROOM/state` (~100 ms si cambió algo), lo que hace a `ROOM/action`
  (bloques, golpes, muerte…) y el chat a `ROOM/chat`. **No hay anfitrión**: cada uno es dueño sólo de
  su jugador y aplica lo de los demás.
- Lo construido: cada trozo tocado se guarda en el broker como mensaje **retenido**
  `ROOM/mundo/cx_cz` (lista de bloques cambiados, deflate + base64, a los ~3 s). Al suscribirse, el
  broker los entrega todos. También hay retenidos de la hora/clima (firmados), contenedores, y la
  última versión del juego (`mcpe12_jxs_porteo_version`, firmada).
- **El número de versión del HTML entra en el nombre de la sala**: HTML nuevo = salas nuevas = los
  servidores arrancan de cero. Los que tienen una versión vieja siguen en las suyas y se les avisa
  que hay una nueva. Por eso "sin crear otra versión" = **quedarse en las mismas salas, con lo
  retenido que ya tienen**: el arreglo va del lado del cliente (filtrar/curar lo que llega) o
  limpiando los retenidos desde un cliente que sí llegue al broker.
- Desde el sandbox **no se llega al broker** (el proxy no deja WebSocket ni puertos ≠ 443): todo se
  prueba con un broker local y se verifica en el teléfono.
- Cualquiera puede publicar cualquier cosa al broker: **todo lo que llega se valida** (`num()` con
  rangos, longitudes máximas, listas ≤ 3000 bloques, trozos ≤ 600 000 caracteres) y lo que no cierra se
  ignora. Los cambios de otros pasan por `R.protegido` antes de aplicarse **y** antes de guardarse en
  `cambios`.
- Rangos (dueño/admin/op): claves públicas firmadas, el código vive sólo en un archivo privado.

### 4.4 La Base de los servidores (v17)
- No la construye nadie: **la dibuja el generador de cada jugador** al crear cada trozo (mismo
  plano en la página y en el worker), así que es igual para todos, aparece entera en cada versión
  nueva y no ocupa nada en el broker.
- Lugar: alrededor del punto de aparición (`lugarDeAparicion(semilla)`); piso = mediana de 81
  columnas del terreno (`Base.nivel`). Zona de 65×65 (`MEDIO = 32`), con **falda** de 10 bloques que
  mezcla el terreno con suavidad (sin barrancos) y sin árboles ni aldeas hasta `FALDA + 4`.
- Contenido: muralla con 4 torres y 4 puertas, plaza con fuente y monumento, mercado (4 puestos),
  gremio de clases, banco, taberna, **14 NPCs** (aldeanos y golems de hierro): tienda, trueque,
  botín con tiempo de espera, misiones, bóveda (cofre del End) y **5 clases** (guerrero, arquero,
  minero, explorador, granjero) con ventajas; la clase viaja en el estado de red (`cl`).
- Los NPCs son bichos **locales** (no van por la red), invulnerables; al tocarlos abren su menú.
- Protección (`Base.permitido`): adentro de la zona no se pone ni se rompe nada, salvo abrir/cerrar
  puertas, trampillas y portones y prender/apagar hornos (61↔62). Se aplica en **cuatro lugares**:
  `Mundo.poner` (lo propio), `Red.protegido` (acciones remotas, trozos retenidos y lo que se anota),
  el worker (agua/lava, crecimiento, fuego, caídas y los "parches" de la red).
- Zona segura: sin monstruos (los que entran se esfuman, no aparecen), sin PvP. Comandos `/base`
  y `/spawn`.
- Pruebas hechas: la clase se ve entre jugadores, lo remoto adentro se ignora, afuera pasa, no hay
  daño adentro y afuera sí.

### 4.5 Decisiones de producto (ya tomadas)
- Por defecto: **modo Java** con buena iluminación y **resolución de render 70 %**.
- Al entrar por primera vez: pregunta el **idioma**, nombre y skin.
- Sombra del jugador, con opción para apagarla.
- Gama: *Realista* (propio, inspirado en shaders tipo Iteration) para gama alta; *Java* (propio,
  tipo BSL/Bliss/Eclipse livianos) para media; *luz real/sombras dinámicas baratas* para gama baja;
  luz automática según la placa.
- Objetivo de rendimiento: 60 fps clavados en un TCL 20 SE (120 en pantallas de 120 Hz), inspirado en
  Sodium: mallas por trozos en worker, menos llamadas de dibujo, nada de tirones al generar.
- Servidores: primero siempre de día, después con noches (la hora y el clima del servidor van
  firmados y retenidos; el amanecer llega cuando duermen todos). Todos los comandos para admins;
  creativo con inventario completo ordenado como la 1.2.

### 4.6 Look "Java" (render.js) — sirve también para otros motores
- Tono de película **ACES (Narkowicz)** sobre color lineal (`c²`), exposición 0,8; después
  `sqrt(...)*1,1` y saturación 1,15.
- Sol cálido y sombra azulada: `amb * [0,92; 0,98; 1,1]`, sol `* [1,15; 1,06; 0,92]`.
- Niebla teñida por el sol: `pow(dot(vistaDir, solDir), 5)`; bruma del aire:
  `mezcla hacia cenit*0,9 + niebla*0,1` con peso `clamp(dist/220)*0,12`.

---

## 5. Geometry Dash (referencia; cerrado)

- Está en el repo (`porteos/geometry-dash`): motor propio JS/WebGL2, 8 modos de física a 240
  pasos/s, niveles en su formato, triggers 2.2, menús, editor completo, niveles online.
- Datos: `empaquetar.py RUTA/assets SALIDA/sitio` → `armar.py SALIDA/sitio` →
  `subir.py` (Cloudflare con puerta). Lo online pasa por el worker de la puerta (`/__gd/`).
- Pruebas rápidas por URL: `?nivel=N&noclip=1&x=X`, `?editor=nuevo`, `?pantalla=menu|seleccion|garaje|creador`.
- **No retomar.**

---

## 6. Hosting privado (Cloudflare Pages con puerta)

- `herramientas/porteo/cloudflare/`: `_worker.js` (la puerta), `subir.py`, `abrir.html`, `LEEME.md`.
- Sin la clave **no sale ni la página ni un byte del juego**. Cookie firmada de un año, o enlace
  `https://…/#clave=XXXX-XXXX-XXXX-XXXX` (lo de después del `#` no viaja al servidor).
- La clave se inventa si no existe el archivo (16 caracteres, ~79 bits), va al proyecto como
  secreto `CLAVE`, **nunca al repo**. Cambiarla cierra todas las sesiones.
- `subir.py` deja el proyecto **fail-closed** (si se pasa el tope gratis, da error en vez de servir
  sin puerta) y verifica desde afuera que sin clave no sale nada (rutas disfrazadas, cookies
  falsas).
- Dentro de otra página (visores de HTML, Rezona): la cookie no viaja; la puerta entra con `fetch`
  y la sesión va en la ruta `/__s/<vence>.<firma>/`. Por eso no manda `X-Frame-Options`.
- Archivos > 25 MiB: se parten en pedazos de 20 MB (`descargas.py`).

---

## 7. Shaders de Bedrock (RenderDragon) — "JX Java RD"

### 7.1 Lo básico
- Bedrock 26.x (26.50 en septiembre de 2026). Los shaders son **`.material.bin`** en
  `renderer/materials/` de un resource pack (`.mcpack`).
- Android: **MB Loader** (Play Store, `io.github.bambosan.mbloader`) → abrir Minecraft con
  **"MBL2/Draco"** → activar el pack en **Recursos globales** (no en el mundo). MBL2 0.1.17 soporta
  26.50. Informan que desde 26.40 muchos shaders perdieron la detección de hora/niebla.
- No hace falta "otro mod" para activarlo: MB Loader ya inyecta. Un APK propio que parchee el juego
  = tocar binarios de terceros; no se hace.
- Samsung M12 (Exynos 850, Mali-G52 MP1): gama baja, **sin Vibrant Visuals**.

### 7.2 Qué se puede y qué no (la verdad)
- Un pack de shaders en el pipeline **forward** (el de los dispositivos sin Vibrant Visuals) **no
  tiene pasada de mapa de sombras ni pasada de post-proceso** → no hay sombras proyectadas reales ni
  bloom real. Eso sólo existe en el pipeline *deferred* (Vibrant Visuals).
- Lo que sí se aproxima, barato (por vértice/fragmento):
  1. sombra de "luz de cielo" (lightmap): bajo techos, árboles y en cuevas;
  2. **sombra por cara según el sol** (JX 2.0): la normal de la cara sale de las derivadas
     (`cross(dFdx(v_position), dFdy(v_position))`), se compara con la dirección del sol (o de la luna
     de noche) → cara que mira al sol = luz, cara de espaldas = sombra azulada, y se mueve con la
     hora; se deshace parte del sombreado fijo de Minecraft (arriba 1, abajo 0,5, x 0,6, z 0,8);
  3. **halo/bloom falso** del sol y la luna en el shader del cielo;
  4. niebla teñida por el sol y bruma azul de distancia.
- **No hay** sombra de un árbol estirándose sobre el piso cuando baja el sol.
- Vibrant Visuals en un celular no soportado: existe el *PandaMine's Vibrant Visuals Unlocker*
  (reemplaza `tiers.bin`; en Android hay que editar el APK con MT Manager; licencia "All Rights
  Reserved": **no se redistribuye**). No se recomienda en gama baja: soporte oficial de VV en
  Android = Adreno 640+, Mali-G68/G77, Xclipse 530+; con placas más flojas informan terreno
  invisible, bajos fps y mobs negros.

### 7.3 Cadena de herramientas (todo compilado desde fuente)
- **Lazurite 0.10.0** (veka0, LGPLv3, Python puro): compila y junta shaders en `material.bin`. Llama a
  shaderc con `--platform android -p 300_es --type vertex|fragment --varyingdef … -i … --define …`
  y espera shaders de bgfx **versión 5**.
- **shaderc** del fork `devendrn/bgfx-mcbe` (`BGFX_SHADER_BIN_VERSION 5`), con `bx` fijado en
  `198cd12` y `bimg`; se compila con **GENie + make**. (No usar binarios bajados.)
- **Newb X** (`devendrn/newb-x-mcbe`, **MIT**): estructura del proyecto
  `src/materials/<Mat>/{vertex.sc, fragment.sc, varying.def.sc, material.json, config.json, uniforms}`,
  `src/newb/{config.h, main.sh, functions/*.h, pack_config.toml}`, `include/`, `tool/`, `assets/` y
  las definiciones JSON `src-materials-1.26.51.zip` (13 materiales). Hay que conservar la licencia
  MIT dentro del pack y acreditar a Newb, Lazurite y bgfx.
- Venv con lazurite y dependencias (`pip --no-binary :all:`).

### 7.4 Comandos
```sh
# materiales sueltos (rápido, 10-15 s)
LD_LIBRARY_PATH=./tool/lib PY tool mats -p android -m RenderChunk Sky [-s JX_ULTRA]
# pack completo (~25 s) → build/jxjrd-<v>-android.mcpack y build/pack-android/
LD_LIBRARY_PATH=./tool/lib PY tool pack -p android
# desempaquetar un material para mirar el GLSL generado
lazurite unpack build/android/RenderChunk.material.bin -o carpeta
```
- Subpacks: `JX_COMPLETO`, `JX_ULTRA` y `DEFAULT` (el de más a la derecha es el que queda por
  defecto). Banderas en `config.h` (`#ifdef JX_ULTRA`…).
- `tool/data/.builder.pkl` guarda la configuración (sistema, URL de materiales, shaderc).

### 7.5 Qué lleva JX Java RD 2.0
- `NL_TONEMAP_TYPE 5` (ACES) con exposición `NL_JX_EXPOSURE 0.245`, saturación 1.15, sombra azulada
  `NL_JX_SHADE_TINT`, niebla del sol `NL_JX_SUN_FOG`, bruma `NL_JX_HAZE`, rayos `NL_GODRAY 0.3`.
- Nuevo en 2.0: `NL_JX_SUN_SHADOW` (sombras por cara), `NL_JX_MOON_SHADOW`, `NL_JX_UNBAKE`,
  `NL_JX_FOLIAGE`, `NL_JX_BLOOM`. Los bichos y el jugador también tienen lado iluminado y lado en
  sombra (en la mano no: su espacio no es el del mundo → `JX_NO_SUN_DIR`).
- Apagados para gama baja: sombra de nubes, niebla de nubes, bruma de lluvia, arcoíris, brillo
  de glow, olas de agua, aurora, estrellas fugaces, resalte de bordes de entidades, ruido de lava.
- Amaneceres dorados (no rosados): `NL_DAWN_*` más cálidos. Pack: nombre "JX Java RD", UUIDs
  propios, `min_supported_mc_version [1,26,50]`.

### 7.6 Cómo se prueba sin el teléfono
- `validar_glsl.mjs <carpeta>`: compila **todos** los `.glsl` desempaquetados en WebGL2 (Chromium +
  ANGLE/swiftshader). Meta: 0 fallas (2092 variantes).
- `enlazar_glsl.mjs <carpeta> [filtro]`: enlaza vértice+fragmento de cada variante. Las 73 que no
  enlazan **ya fallaban en Newb original** (pases `DepthOnlyOpaque` de Actor/ActorGlint/
  ActorMultiTexture y `Stars/Transparent`, que no se usan): se comparan contra el original.
- `preview/vista.mjs <carpeta con RenderChunk, Sky, SunMoon> <prefijo>`: dibuja con los GLSL
  compilados un cielo, el sol y un terreno de prueba a 5 horas del día. Para comparar versiones: una
  imagen antes | después.
- Secuencia de entrega: `tool pack` → desempaquetar todo → validar → enlazar → vista previa →
  escaneo de secretos del pack → mandar `.mcpack` + una imagen.

### 7.7 Trampas
| Síntoma | Causa | Arreglo |
|---|---|---|
| `JX_ULTRA` no compila ("`NL_GLOW_TEX` undeclared") | `#undef NL_GLOW_TEX` rompe `nlGlow` | no deshacer la macro: condicionar la llamada con `#ifndef JX_ULTRA` en `fragment.sc` |
| La vista previa dice "falta …/RenderChunk/passes" | otra estructura de carpetas al desempaquetar | enlaces simbólicos por material (`jx_flat`) |
| Texturas estiradas en rayas | UV en el borde con `fract` | recortar los UV 0,0005 / 0,999 |
| Atardeceres rosados | colores `DAWN` de Newb | subirlos hacia dorado |
| Cuidado con `uv1`/`uv0` | están codificados | `uv1 = fract(a_texcoord1.y*vec2(256,4096))` = (luz de bloque, luz de cielo); `uv0 = fract(2*a_texcoord0)` |
| Sombras del lado equivocado | `env.sunDir` de Newb no es la dirección real del sol dibujado (el shader de `SunMoon` rota con otro signo) | dirección real hacia el sol en el mundo = `(-sunDir.x, sunDir.y, -sunDir.z)` (para la luna igual con `moonDir`); en `nlRenderSky` además `viewDir.y = -viewDir.y` |

---

## 8. Trampas generales del Minecraft

| Síntoma | Causa | Arreglo |
|---|---|---|
| `B is not defined` en `npc.js` | el global es `Bichos` | usar `Bichos` |
| Puestos del mercado raros | `en(a, b, y, id, m)` con argumentos en otro orden | revisar orden de argumentos; probar con vista aérea |
| Carteles de NPC amontonados | todos a la vez | límite 16 bloques, orden por cercanía y separación en pantalla |
| Barrancos fuera de la muralla | aplanar sin transición | falda de 10 bloques con `smoothstep` |
| El jugador de prueba muere | caída | `Admin.desbloqueado/dios` en el escenario |
| Una prueba de red cuelga | broker viejo vivo | `red_suites.sh` mata el broker por PID entre pruebas |
| "El servidor no cambió" | las salas son por versión | cambiar el número firmado (o curar del lado del cliente) |

---

## 9. Plantillas de pedido (copiar y completar)

**Portar un juego**
> Portá `<JUEGO>` a un HTML único (JS + WebGL2, motor propio, nada del binario). Datos públicos se
> bajan al empaquetar, nada al repo. Meta: 60 fps en `<TELÉFONO>`, táctil, menú de gráficos, valores
> por defecto razonables. Reglas: secciones 1 y 3 de CONOCIMIENTO. Entregame el HTML en cada hito con
> una captura. Sin segundo plano.

**Shader RenderDragon**
> Hacé un `.mcpack` de RenderDragon para `<CELULAR>` (sin Vibrant Visuals), basado en Newb X (MIT),
> toolchain compilada desde fuente. Look: `<REFERENCIA>`. Validá todas las variantes, vista previa
> antes/después y escaneo de secretos. Entregame el `.mcpack` y una imagen. Sección 7.

**Cambiar algo de la Base / servidores**
> En el Minecraft (sección 4.3-4.4): `<QUÉ>`. Sin crear versión nueva si se puede / con versión nueva
> si hace falta. Probalo con el escenario `<esc>` y mandame el HTML.

**Reportar un bug**
> Versión `<N>`, servidor `<nombre>`, coordenadas `<x y z>`, qué esperaba / qué pasó, captura.

**Pedir un mod o contenido**
> Agregá `<COSA>` al Minecraft con el estilo de la 1.2: sin copiar mods bajados; hecho propio. Sección
> 4.5 para los valores por defecto.

---

## 10. Estado (al escribir este archivo)

- Minecraft: **v17** entregada (base en los servidores, NPCs, clases, protección, zona segura).
- Shader: **JX Java RD 2.0** entregado (sombras por cara + halo del sol). 1.0 queda obsoleta.
- Pedido en curso: reparar lo que se destruyó en la base de los servidores sin subir de versión y
  agrandar la zona segura (sin peleas mob↔jugador ni jugador↔jugador).
- Ideas abiertas: auditoría de rendimiento en un M12 real, sombra proyectada barata (sólo con VV),
  modo "Realista" propio para gama alta.

---

## 11. Hajime no Ippo 2: Victorious Road (PS2) → APK nativo

- Pedido del dueño: **APK, no HTML**. Motor propio en C + OpenGL ES 3 con `NativeActivity`
  (`hasCode="false"`, sin Java). Entregado **v2** (pelea jugable vs CPU). Las fuentes y herramientas van
  dentro del APK entregado: `assets/fuente.tar.xz` (desarmar el APK = retomar). Nada del juego al repo.
- ISO (SLPS_252.87, 3 GB) desde Drive: `drive.usercontent.google.com/download?id=…&export=download&confirm=t`.
  El ELF trae **tabla de símbolos y DWARF 1** (CodeWarrior): nombres de funciones, estructuras con
  nombres de campo. Lectores propios: `elfsym.py`, `dwarf1.py`, `desens.py` (capstone compilado desde
  fuente, con extras R5900), `llamadas.py`. Los `.OVR` de DATA son overlays: texto desde 0x40, base 0x4f3380.
- Formatos (`tools/` en el backup): **PKT** "KP" (árbol anidado de archivos); **BMR** "BR" textura 4/8 bits
  con paleta: 8 bits subidos como PSMCT32 (w/2×h/2), 4 bits como **PSMCT16** (w/2×h/2), CLUT de 8 bits
  con CSM1 (bloques 8-15↔16-23); alfa PS2 ×2. Tablas del GS de `GSTables.cpp` de PCSX2.
  **DFF** RenderWare genérico (no nativo) con Skin+HAnim; `texNNN` = N-ésimo BMR del PKT (con repetidos);
  partes del boxeador (BRBD cuerpo, BRTK pantalón, BRHD cabeza, BRHA pelo, BRGL guantes, BRSH botas) con
  raíces propias: se hornean a la pose de enlace global. Pelo/cejas vienen grises (se tiñen).
  Colores de vértice de los boxeadores = índices de morph (no usar); los de la arena sí (luz horneada).
- **MTX** "TM" (movimientos): cabecera 44 B (`joint_num, motion_num, motion_adr, frame_adr, rot_adr,
  loc_adr[2]…`); cuadro clave 16 B `{time, rot_no, loc_no[2], xyz[3], rtb}`; ángulos int16 ×π/2048 con
  **y,z negados**, R = Rx·Ry·Rz; articulación k = HAnim ID k−1; cadera desde `loc[0]`, el resto `loc[1]`
  (`loc_no1*24 + k−2`); **traslaciones × 0,235** (trans_scale, ajustado con pies plantados); cada clave se
  alcanza en `time` ticks (60/s) desde la pose actual (slerp). Raíz a 478 + apoyo dinámico del pie.
- Movimientos usados (boxer_i2): guardia 0, guardia cerrada 7, jab 790, recto 795, ganchos 548/556,
  uppers 751/660, cuerpo 793/797, esquivas 133/135/136/137. bx_dmg: 8/11 leve, 9 fuerte, 10/0 cuerpo,
  12/14 tambaleo. bx_down: caídas 0–34, lona 46, levantada 47. won_bx_chara01: 0. **FEX** = tabla de
  acciones (transiciones por evento, costo de stamina), semántica de botones en `FR_Item2Act` (sin cerrar).
- Sonido: HD "IECS"+BD = VAG/PS-ADPCM (`vag.py`); golpes `ip2_hit_seq` (0-3 cara, 9-12 cuerpo, 13 bloqueo,
  26 lona, 35/36 aire), público `ip2_mom`, gimnasio `ip2_amb_gim` (0 ambiente, 2 campana), árbitro
  `ip2_refree_eng`. Se guarda el ADPCM y se decodifica al iniciar; mezclador sin bloqueos en AAudio.
- **APK sin SDK/NDK**: `clang-18 --target=aarch64-linux-android26`, cabeceras propias (`inc/plat.h`,
  verificadas con AOSP), libs *stub* generadas de los símbolos usados (`compilar.py`), manifest binario
  propio (`axml.py`, ids de `public-final.xml`, atributos ordenados por id), firma v2+v3 con **apksig
  compilado desde fuente** (`Firmar.java`) que además verifica. Clave en la carpeta privada: si la sesión
  es otra, la clave cambia → desinstalar antes de instalar.
- Pruebas sin teléfono: el mismo motor en Linux con el ANGLE+SwiftShader de Chromium (`main_linux.c`,
  `IPPO_AUTO=1` pelea CPU vs CPU, `IPPO_POSE=archivo:mov:clave`, `herr/grilla.py` para identificar movs).
- Siguiente: probar en el TCL; ETC2 + vértices cuantizados; estadio con público (PLACE*); menú y elegir
  boxeador; música; especiales (sp_move_*), estilos (peek, wild, hit…).

---

## 12. Super-Human (juego propio para Rezona, HTML único)

- Pedido: simulador de superhéroes, mundo abierto vóxel, todo en inglés, sin emojis, para WebView
  (TCL 20 SE). Entregado **v5** (`Super-Human-v5.html`, ~1 MB, no pide nada a la red). Fase siguiente:
  poderes y situaciones (crímenes, rescates). El juego no va al repo; el HTML entregado es la fuente.
- Motor propio WebGL2, sin librerías. En el HTML, módulos separados por `/*==== módulo: X ====*/`, en orden:
  util, gl, audio, ui, space, voxel, char, anim, charrender, creator, city, props, citymesh, cityrender,
  input, hud, npc, traffic, world, main. Armado: `shell.html` + `ui.css` + módulos → `/*@CSS@*/`, `/*@JS@*/`
  (IIFE con "use strict"), `@@FONT@@` (Oswald, OFL), `@@DAY@@`/`@@AUX@@` (Tierra), `@@VERSION@@`.
- Tierra del menú (NASA, dominio público): día = Blue Marble NG julio (WebP 2048×1024); aux = R nubes,
  G luces nocturnas, B máscara de agua. Halo de atmósfera por rayo; Vía Láctea horneada una vez. La esfera
  es CCW (con `frontFace(CW)` se ve el interior y todo sale celeste).
- Personajes: rejilla de 2 cm. Cuerpo = SDF por hueso (unión suave sólo dentro de la misma cadena), cabeza
  diseñada vóxel a vóxel (8×12×10: ojos fila 6, cejas 7 salientes, nariz 4-5, boca 2), 18 peinados, ropa y
  trajes pintados por zona, capa con 3 huesos. 20 huesos rígidos, paleta de 17 ranuras por instancia (color
  sin rehacer malla), LOD 2/4/8 cm con `VGrid.half()`. Vértice de 12 B (pos Int16 en 2 mm + hueso; u8
  normal/ranura/tono/AO).
- Animación procedural, Euler Ry·Rx·Rz (brazo/pierna adelante = X negativo, rodilla flexión = X positivo):
  reposo, locomoción con fase por velocidad, aire, golpes por cuadros clave (jab, cross, hook, upper, kick),
  reacciones, caída y levantada, agacharse, gestos.
- Ciudad (semilla 20260): 9×10 manzanas de 100×80 m, calles de 14 m (2 carriles por mano), veredas de 4 m,
  costanera con muro. Trozos de 200×160 m: fachadas (ventanas procedurales en el shader) + suelo/detalles
  (material por vértice) + mobiliario y autos por instancias. Posiciones Int16 a 1/64 m; el horizonte va a
  1/4 m (a 1/64 desborda y tapa la ciudad con triángulos gigantes).
- Sombras: mapa de profundidad que sigue al jugador (re-horneado al alejarse 45 % del radio), comparación
  por hardware. Downtown queda a la sombra de las torres: es real, no un error.
- Tránsito: conectores Bézier en las intersecciones, semáforos (ciclo 34 s), frenan por autos/peatones/
  jugador. Civiles: grafo de veredas y sendas, esperan el semáforo, huyen, se agachan, reciben golpes.
- Pruebas (Playwright + SwiftShader): `?test=menu|creator|game`; pasos eval/click/key/down/up/wait/shot;
  `Creator.lineup = [specs]` (+ `lineSeq`) para comparar personajes y poses; `World.debugCam = {eye, tgt}`
  para vistas aéreas; CPU frenada ×6 por CDP para medir; juego al azar 75 s sin errores. En GLSL `patch` es
  palabra reservada. **Adreno (TCL): ningún arreglo indexado con variable en GLSL, ni `const` ni de uniforms**
  (v1 y v2 no arrancaban: "Link skin: … cannot compute gv size for oob"; SwiftShader no lo detecta). Huesos y
  paletas van en texturas RGBA32F leídas con `texelFetch` (una fila por dibujo, `CharGL.begin/draw/flush`);
  normales por cálculo; sombras sólo en el shader de píxeles. Al arrancar se compilan todos los programas y la
  pantalla de error lista los que fallen, con build y GPU.
- **v4** (dueño en créditos: **Goshumio**): 24 huesos (capa en 5 tramos, falda en 2 mitades); textura de datos de 92 texeles
  (huesos 0-71, paleta desde 72). Altura por especie (`Char.HEIGHTS`, humano 1,50-2,47 m): el modelo vóxel cubre 1,50-1,92 m y lo
  demás es escala en la matriz raíz (`J.scale`, `J.Ht`). `body.js`: capa = cadena de 6 puntos con colisión contra cápsulas del cuerpo
  y tope (no sube de los hombros ni pasa adelante); falda = cada mitad copia el giro del muslo al 85 % (8 paños rígidos se deshilachan);
  ragdoll PBD de 20 partículas, límites de cono en cadera (ángulo sagital + apertura), bisagras, "músculos" hacia una pose de
  protección que se apagan a los 1,4 s, levantarse con mezcla de matrices (cuaterniones) hacia `Anim.getup` (boca arriba/abajo).
  Líneas del piso: corrimiento de profundidad según distancia en el shader del suelo. `World.knock(vx,vz,spd)` prueba el atropello.
- **v5**: 17 huesos (sin huesos de capa/falda). `cloth.js` = tela PBD de verdad (capa 9×11 anclada en arco de hombro a hombro
  por la nuca; falda tubo 18×6 en la cintura), anclajes de largo alcance, arrastre por normal, colisión con cápsulas, se dibuja de los dos
  lados (programa `cloth`). Personajes instanciados: `CharGL.draw` COPIA huesos/paleta (el creador reusa el arreglo) y `flush` agrupa por
  malla con `drawElementsInstanced` (fila = uRow + gl_InstanceID, destello en el texel 69). Civiles: rejilla de vecinos, fuerza social
  (mira 3,4 m adelante, esquiva al costado libre, frena), carril por la derecha, parejas, mirar al jugador, empujones; densidad 32/50/72/96.
  Bug del "piso que desaparece": la caja de culling de cada trozo es la real de sus vértices (las piezas se pasaban del borde nominal).
  Cámara ≥ 0,75 m sobre el piso. Fachadas: ventanas con interior por paralaje, marcos, alféizares, persianas; locales con vidriera,
  estantes y carteles con letras. Patada circular verificada numéricamente (pie a 1,3 m y 1 m adelante); esquive = rodada (`Anim.roll`).
- Medido: ~25 llamadas de dibujo y ~32 k triángulos en la calle; JS < 1.5 ms por cuadro en PC. El TCL arranca
  en calidad Media (Adreno 610) con resolución adaptable (baja rápido, sube lento).

*Si algo de acá no coincide con lo que se ve en el código, manda el código: este archivo es un mapa, no
la fuente.*
