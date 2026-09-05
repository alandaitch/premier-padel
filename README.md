# Premier Padel

Juego 3D de pádel en español. Cuarta edición jugable, inspirada en Premier Padel.
Implementación independiente con Three.js, React y Vinext/Vite. No modifica alandaitch.com.

## Jugar

- Partido rápido y torneo reducido de tres rondas: el botón de modo inicia directamente.
- Entrenamiento con cuatro ejercicios: peloteo, vidrio, doble pared y remate.
- Ocho parejas seleccionables, contrastadas con Madrid P1 y perfiles FIP de 2026.
- Madrid P1, Paris Major e Italy Major, con recreaciones distintas de ambiente y arquitectura.
- Un set corto, un set completo o partido al mejor de tres sets.
- Tres dificultades y tres cámaras.
- Configuración y títulos obtenidos guardados en este navegador.

Teclado: WASD/flechas para moverse. J: golpe normal; K: globo; L: remate;
U: bandeja; I: víbora; O: toque corto. Cada tecla ejecuta el golpe directamente.
Espacio saca o pega normal. J adapta plano/volea/bajada; O adapta dejada/chiquita.
Shift junto al golpe añade potencia; R cambia retorno/por 3/por 4; H: contrapared.
B mantenida o botón «Esperar vidrio» para ceder espacio al rebote.
Q/E para dirigir; Tab para cambiar jugador; Escape para pausar.
Los números 1–9 y 0 siguen disponibles y ahora ejecutan el golpe directamente.
Enter inicia partido rápido desde el menú sin foco en un botón.
Sin movimiento manual, una asistencia acerca al jugador a la pelota. El golpe requiere una orden.
Hay joystick y golpe táctiles en pantallas angostas.

## Funciona en esta edición

Dobles 2×2 con compañero y rivales IA; gravedad y rebotes; vidrio y malla;
saque por abajo con pique previo, cuadro diagonal, segundo servicio y let;
red y doble pique; plano, volea, globo, bandeja, víbora, remate, dejada, chiquita,
bajada y contrapared. Las selecciones incompatibles con la altura o el pique
se adaptan a un golpe de fondo o bandeja.

Predicción de ambas paredes; defensa que espera el vidrio y acompaña su salida;
subida de la pareja tras globo y recuperación de red tras bandeja.
Remate con pique, rebote de fondo y vuelta sobre la red: sigue vivo para el receptor.
El receptor puede alcanzar con la pala sin cruzar el cuerpo; el último equipo que golpeó no repite.
Marcador de juegos/sets, tiebreak y Star Point 2026 con elección de lado de recepción. Pantalla final, revancha,
siguiente ronda, título y vuelta al menú.

Pelota con giro en tres ejes, resistencia del aire, Magnus y fricción en el contacto.
El pique depende de velocidad, giro y superficie; se retiraron los impulsos artificiales por golpe.
La caída de referencia desde 2,54 m cumple el rango FIP sobre superficie dura.
Vidrio, césped y malla tienen parámetros aproximados documentados en `PHYSICS-V4.md`.

Dieciséis perfiles con altura FIP, mano dominante y lado de cancha; Coello, Sanz y Arce zurdos.
Pelo, barba, complexión, camisetas, nombres y palas diferenciados, conectados a cada selección.
Modelos y rasgos aproximados a fotografías oficiales, no escaneos fotográficos.

Cancha y palas con texturas locales, iluminación/sombras, jugadores articulados,
público instanciado, rastro de pelota, indicador de jugador y pista libre de controles.
Sonido Web Audio sintetizado: golpe, pique, vidrio, red, aplausos y ambiente.
La intensidad acompaña la velocidad real de la pelota. El audio se inicia mediante una interacción del usuario.

## Ejecutar y validar

Node 22.13 o posterior.

```sh
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
npm run typecheck
npm test
npm run build
```

En V4 pasan las 37 pruebas, TypeScript, el build y el lint de los módulos `game/` modificados.
El lint global conserva advertencias y errores previos en la UI base y en `app/padel-game.tsx`
(reglas del compilador React y semántica accesible). No se considera una validación global limpia.

## Estructura

- `game/physics.ts`: simulación independiente, IA, saque, golpes y ScoreKeeper.
- `game/renderer.ts`: escena Three.js, materiales, rigs, animación y cámaras.
- `game/audio.ts`: audio espacial sintetizado con Web Audio.
- `game/catalog.ts`: parejas, sedes y catálogo de golpes.
- `game/player-profiles.ts`: identidad visual, altura, lateralidad e indumentaria.
- `PHYSICS-V4.md`, `RENDERER-V4.md`, `PLAYERS-V4.md`: fuentes y alcance de la revisión.
- `PADEL-REVIEW-V4.md`: auditoría independiente de esta edición.
- `app/padel-game.tsx`: ciclo fijo 120 Hz, entradas, UI, torneo y persistencia local.
- `game/physics.test.ts`: pruebas de reglas, trayectorias, ejercicios, táctica y partido completo.
- `PADEL-DYNAMICS.md`: investigación primaria FIP/LTA y criterios de aceptación.
- `TE4-REVIEW.md`: auditoría visual independiente contra capturas oficiales reales de TE4.

## Límites y orden de mejora

1. **Contacto y animación.** Las poses son procedurales. Se añadieron preparación,
   giro junto al vidrio, apoyo/salto del remate y pala dirigida al contacto real.
   Falta naturalidad corporal y variedad equivalente a animación capturada.
2. **Tacto y táctica.** Contacto asistido y margen amplio; spin y fricción aproximados.
   IA sin estilos individuales, con errores determinísticos. No hay recuperación exterior,
   falta por contacto corporal ni por tocar físicamente la red.
3. **Jugadores, público y materiales.** No hay likeness facial ni modelos escaneados.
   Hay rasgos, ropa, alturas y lateralidad propios; falta semejanza facial fina. El público resulta repetitivo.
   Los escenarios evocan las sedes; no reproducen sus estadios con exactitud.
4. **Audio.** Efectos sintetizados; faltan grabaciones de pista, pasos, arbitraje y público variado.
5. **Circuito.** Tres rondas predefinidas, sin clasificación mundial, carrera, calendarios,
   cuadro completo dinámico, progresión de habilidades ni guardado del partido en curso.

No hay multiplayer online ni soporte específico de gamepad. No se afirma paridad global con TE4.

## Fuentes

- FIP, reglas de pádel 2026: https://www.padelfip.com/wp-content/uploads/2025/12/FIP_Rules-of-Padel-1.pdf
- FIP, Star Point: https://www.padelfip.com/es/2025/12/entre-innovacion-y-tradicion-llega-el-star-point-el-sistema-de-puntuacion-que-cautiva-a-todos/
- Parejas Madrid 2026: https://www.madridpremierpadel.com/2026/08/28/las-grandes-estrellas-de-padel-mundial-ya-tienen-fecha-de-debut-en-madrid/
- Sedes Major: https://www.padelfip.com/2025/06/premier-padel-and-fip-secure-major-renewals-across-flagship-tournaments-and-announce-strategic-developments-as-tour-continues-its-meteoric-growth/
- Referencias TE4: https://www.managames.com/tennis/screenshot_en.html

La salida por tres termina el punto porque esta edición no habilita juego exterior.
El efecto y los contactos son modelos aproximados. Se calibró la caída FIP y se comprobó energía pasiva;
falta medición de trayectorias con cámaras y datos de cada césped/vidrio real.

Los nombres identifican jugadores y torneos reales. Las geometrías, texturas y sonidos se crean localmente.
No se reutilizan texturas, modelos ni audio de Tennis Elbow 4. Outfit y Barlow Condensed: Google Fonts.
