# Premier Padel

Juego 3D de pádel en español. Octava edición jugable, inspirada en Premier Padel.
Implementación independiente con Three.js, React y Vinext/Vite. No modifica alandaitch.com.

## Jugar

- Partido rápido y torneo de tres rondas masculinas o dos femeninas; el modo inicia directamente.
- Entrenamiento con 18 ejercicios: cada golpe, cuatro remates, paredes y rescate exterior.
- Ocho parejas masculinas y cuatro femeninas, contrastadas con Madrid P1 y perfiles FIP de 2026.
- Madrid P1, Paris Major e Italy Major, con recreaciones distintas de ambiente y arquitectura.
- Un set corto, un set completo o partido al mejor de tres sets.
- Tres dificultades y tres cámaras.
- Configuración y títulos obtenidos guardados en este navegador.

El esquema predeterminado usa WASD/flechas, J y K combinables y L para cargar el remate.
El remapeo y los combos están detallados en `CONTROLS-V6.md` y en «Cómo jugar».

En el esquema clásico opcional: WASD/flechas para moverse. J: golpe normal; K: globo; L: remate;
U: bandeja; I: víbora; O: toque corto. L se mantiene para cargar: A/D apuntan,
soltar en verde busca un remate perfecto. La ventana se ajusta en configuración o pausa.
Los demás golpes se ejecutan directamente.
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

Recuperación exterior habilitada: dos puertas en cada lateral y zonas libres.
El por tres sigue vivo; el rival sale por la puerta y devuelve antes del segundo pique.
Movimiento manual y de IA respetan el cerramiento. El por cuatro termina el punto.
El apuntado del por tres corresponde al costado real de salida.

Pelota con giro en tres ejes, resistencia del aire, Magnus y fricción en el contacto.
El pique depende de velocidad, giro y superficie; se retiraron los impulsos artificiales por golpe.
La caída de referencia desde 2,54 m cumple el rango FIP sobre superficie dura.
Vidrio, césped y malla tienen parámetros aproximados documentados en `PHYSICS-V4.md`.

Veinticuatro perfiles con altura FIP, mano dominante y lado de cancha. Coello, Sanz, Arce, Josemaría y Ustero son zurdos.
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

V5 incorpora 45 pruebas de física y dos pruebas de carga.
El lint global no pasa: la UI base y `app/padel-game.tsx` tienen observaciones
del compilador React y preferencias de etiquetas semánticas, incluido el medidor personalizado.
El lint de física, renderer, perfiles, sonido y carga sí pasa. No se declara lint global limpio.

## Estructura

- `game/physics.ts`: simulación independiente, IA, saque, golpes y ScoreKeeper.
- `game/renderer.ts`: escena Three.js, materiales, rigs, animación y cámaras.
- `game/audio.ts`: audio espacial sintetizado con Web Audio.
- `game/catalog.ts`: parejas, sedes y catálogo de golpes.
- `game/player-profiles.ts`: identidad visual, altura, lateralidad e indumentaria.
- `game/smash-charge.ts`: carga, potencia y ventanas de precisión.
- `SMASH-V5.md`, `PHYSICS-V5.md`, `RENDERER-V5.md`: cambios, fuentes y límites de V5.
- `PADEL-REVIEW-V5.md`: auditoría independiente contra Virtua Tennis 4 y técnicas reales.
- `PHYSICS-V4.md`, `RENDERER-V4.md`, `PLAYERS-V4.md`: fuentes y alcance de la revisión.
- `PADEL-REVIEW-V4.md`: auditoría independiente de la edición anterior.
- `app/padel-game.tsx`: ciclo fijo 120 Hz, entradas, UI, torneo y persistencia local.
- `game/physics.test.ts`: pruebas de reglas, trayectorias, ejercicios, táctica y partido completo.
- `PADEL-DYNAMICS.md`: investigación primaria FIP/LTA y criterios de aceptación.
- `TE4-REVIEW.md`: auditoría visual independiente contra capturas oficiales reales de TE4.

## Límites y orden de mejora

1. **Contacto y animación.** Las poses son procedurales. Se añadieron preparación,
   giro junto al vidrio, apoyo/salto del remate y pala dirigida al contacto real.
   Falta naturalidad corporal y variedad equivalente a animación capturada.
2. **Tacto y táctica.** Contacto asistido y margen amplio; spin y fricción aproximados.
   IA sin estilos individuales, con errores determinísticos. La recuperación exterior
   ya funciona; faltan variedad de rescates bajos y faltas por contacto corporal/red.
3. **Jugadores, público y materiales.** No hay likeness facial ni modelos escaneados.
   Hay rasgos, ropa, alturas y lateralidad propios; falta semejanza facial fina. El público resulta repetitivo.
   Los escenarios evocan las sedes; no reproducen sus estadios con exactitud.
4. **Audio.** Efectos sintetizados; faltan grabaciones de pista, pasos, arbitraje y público variado.
5. **Circuito.** Tres rondas predefinidas, sin clasificación mundial, carrera, calendarios,
   cuadro completo dinámico, progresión de habilidades ni guardado del partido en curso.

No hay multiplayer online. El gamepad tiene mapping configurable; falta prueba con hardware físico. No se afirma paridad global con TE4.

## Fuentes

- FIP, reglas de pádel 2026: https://www.padelfip.com/wp-content/uploads/2025/12/FIP_Rules-of-Padel-1.pdf
- FIP, Star Point: https://www.padelfip.com/es/2025/12/entre-innovacion-y-tradicion-llega-el-star-point-el-sistema-de-puntuacion-que-cautiva-a-todos/
- Parejas Madrid 2026: https://www.madridpremierpadel.com/2026/08/28/las-grandes-estrellas-de-padel-mundial-ya-tienen-fecha-de-debut-en-madrid/
- Sedes Major: https://www.padelfip.com/2025/06/premier-padel-and-fip-secure-major-renewals-across-flagship-tournaments-and-announce-strategic-developments-as-tour-continues-its-meteoric-growth/
- Referencias TE4: https://www.managames.com/tennis/screenshot_en.html

La salida por tres sigue viva para la recuperación exterior; el por cuatro termina el punto.
El efecto y los contactos son modelos aproximados. Se calibró la caída FIP y se comprobó energía pasiva;
falta medición de trayectorias con cámaras y datos de cada césped/vidrio real.

Los nombres identifican jugadores y torneos reales. Las geometrías, texturas y sonidos se crean localmente.
No se reutilizan texturas, modelos ni audio de Tennis Elbow 4. Outfit y Barlow Condensed: Google Fonts.

## Edición 06

Controles por tres familias, combos y remapeo de teclado/joystick. Juego exterior libre con devoluciones por puerta, altas y a la red rival. Remate paralelo alto. Celebraciones, entrenadores, descansos, cambio visual de lado y diálogos ficticios sensibles al marcador.

- `CONTROLS-V6.md`, `GAMEPAD-AUDIT-V6.md`: mapping y límites del mando.
- `PHYSICS-V6.md`: casos exteriores y evidencia de vuelo real.
- `SCENES-V6.md`: continuidad del partido e interludios.
- `RENDERER-V6.md`, `PADEL-REVIEW-V6.md`: presentación y revisión independiente.

`npm test` incluye física, carga, controles, adaptador de mando y director de escenas.

Validación V6: 71 pruebas aprobadas y TypeScript sin errores. Lint dirigido del motor, renderer y módulos de controles/escenas aprobado. El lint global de la UI sigue fallando por reglas de React Compiler y preferencias semánticas de accesibilidad; no se declara limpio. Hardware de joystick todavía no probado físicamente.

## Edición 07

Festejo secreto de Lebrón cuando su pareja gana el partido: **S, S, W, D, J, K**.
Hay ocho segundos para iniciar y completar la secuencia; las seis pulsaciones deben
entrar en 3,2 segundos, sin pausas de más de 0,9 segundos entre ellas.
Respeta el remapeo. En mando: cruceta abajo, abajo, arriba, derecha, A, B.
La animación retira la camiseta y la muestra extendida hacia los rivales, con sonido original.

- `SIGNATURE-V7.md`: activación, límites y pruebas.
- `RENDERER-V7.md`: animación y referencia visual.
- `PADEL-REVIEW-V7.md`: revisión independiente.


## Edición 08

- Estampados integrados a la tela, con referencias oficiales y camisetas diferenciadas.
- Dos banquillos en el lateral derecho, uno por mitad. Entrenador sentado durante el juego, de pie durante el descanso; jugadores sentados, hidratación y conversación.
- Descansos de diez segundos, también en la exhibición del menú. La exhibición abre en el primer descanso ordinario de un partido simulado realmente y luego continúa.
- Subida del sacador y avance en pareja ganado por trayectoria y respuesta rival, con defensa del vidrio.
- 18 ejercicios. Espacio ejecuta el objetivo del ejercicio; L mantiene la carga del remate. Los demás controles y combos siguen disponibles.
- Videos individuales antes y después; política de conservación en `REVIEW-VIDEOS.md`.

Fuentes, pruebas y límites: `PHYSICS-V8.md`, `RENDERER-V8.md`, `SCENES-V8.md`, `PADEL-REVIEW-V8.md`.

El circuito femenino comparte reglas, controles y motor. Tiene cuatro parejas seleccionables, semifinal y final, entrenamiento completo y exhibición con descansos. La apariencia usa variantes de ropa y pelo; no se aplican penalizaciones deportivas por género. Fuentes y límites en `WOMEN-ROSTER.md`.

El trabajo paralelo y el criterio de modelos están documentados en `EXECUTION-GRAPH.md`. Para actualizar la galería local sin modificar videos: `node scripts/review-gallery.mjs`.

Validación V8: 108 pruebas aprobadas, TypeScript y build de producción aprobados. La revisión visual verifica los ocho modelos femeninos, bancos y estampados; registra límites de naturalidad y semejanza facial.
