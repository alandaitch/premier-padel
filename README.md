# Premier Padel

Juego 3D de pádel en español. Tercera edición jugable, inspirada en Premier Padel.
Implementación independiente con Three.js, React y Vinext/Vite. No modifica alandaitch.com.

## Jugar

- Partido rápido y torneo reducido de tres rondas: el botón de modo inicia directamente.
- Entrenamiento con cuatro ejercicios: peloteo, vidrio, doble pared y remate.
- Ocho parejas seleccionables, basadas en la lista de Madrid P1 de 2026.
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

Cancha y palas con texturas locales, iluminación/sombras, jugadores articulados,
público instanciado, rastro de pelota, indicador de jugador y pista libre de controles.
Sonido Web Audio sintetizado: golpe, pique, vidrio, red, aplausos y ambiente.
El audio se inicia mediante una interacción del usuario.

## Ejecutar y validar

Node 22.13 o posterior.

```sh
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
npm run typecheck
npm test
npm run build
```

## Estructura

- `game/physics.ts`: simulación independiente, IA, saque, golpes y ScoreKeeper.
- `game/renderer.ts`: escena Three.js, materiales, rigs, animación y cámaras.
- `game/audio.ts`: audio espacial sintetizado con Web Audio.
- `game/catalog.ts`: parejas, sedes y catálogo de golpes.
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
   Las parejas comparten atributos físicos. El público resulta repetitivo.
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
El efecto, la fricción y la restitución son modelos aproximados; no se han calibrado con captura real.

Los nombres identifican jugadores y torneos reales. Las geometrías, texturas y sonidos se crean localmente.
No se reutilizan texturas, modelos ni audio de Tennis Elbow 4. Outfit y Barlow Condensed: Google Fonts.
