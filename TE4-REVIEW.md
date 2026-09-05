# Premier Padel — revisión independiente contra Tennis Elbow 4

Fecha: 4 de septiembre de 2026.

## Vara y método

La meta es parecerse a TE4, sin exigir superarlo. La revisión separa la calidad visual de la prueba funcional. Una captura puede demostrar encuadre, materiales, anatomía e interfaz. No demuestra continuidad de animación, física, inteligencia artificial ni sonido.

Se inspeccionaron de verdad, con capturas del navegador, las cinco imágenes oficiales siguientes. No se usaron imágenes generadas ni mods como referencia. Son imágenes promocionales publicadas por Mana Games; no permiten inferir rendimiento ni calidad de todas las situaciones del juego.

## Referencias oficiales inspeccionadas

- [Galería oficial de Mana Games](https://www.managames.com/tennis/screenshot_en.html).
- **R1 — Partido en pista azul, cámara de juego:** [imagen 1920 × 1080](https://static.managames.com/Images/TennisElbow4/TE4_ss05.jpg).
- **R2 — Saque indoor, jugador cercano, luces:** [imagen 1920 × 1080](https://static.managames.com/Images/TennisElbow4/TE4_ss03.jpg).
- **R3 — Ficha de jugador y anatomía:** [imagen 1920 × 1080](https://static.managames.com/Images/TennisElbow4/TE4_ss10_en.jpg).
- **R4 — Selección de torneo:** [imagen 1920 × 1080](https://static.managames.com/Images/TennisElbow4/TE4_ss13_en.jpg).
- **R5 — Tierra batida publicada en Steam:** [imagen 1920 × 1080](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/760640/ss_f57464a071060dd065c407b457502c37015be206.1920x1080.jpg?t=1784865043), [ficha oficial](https://store.steampowered.com/app/760640/Tennis_Elbow_4/).

## Lo observado en TE4

R1/R5 muestran una cámara elevada, estable y centrada detrás del jugador. La cancha ocupa la mayor parte del cuadro. Pelota amarilla, líneas claras y red fina conservan contraste. La superficie tiene variación de color fina. Las tribunas incluyen espectadores reconocibles, escaleras, barandas y publicidad. Árbitro, recogepelotas y bancos dan escala al estadio.

R2 muestra sombras humanas suaves sobre la cancha iluminada. Las tribunas quedan en penumbra, pero conservan profundidad. La jugadora tiene proporciones naturales, brazos articulados, cabello, zapatillas y ropa con estampado. R3 confirma un modelado humano reconocible, sin requerir detalle facial moderno.

R1/R2/R5 mantienen el marcador en una esquina. R3/R4 presentan paneles consistentes, selección resaltada, texto legible y navegación visible. La UI puede estar modernizada en Premier Padel: se compara su claridad y terminación, no una copia literal del diseño.

## Criterio de aprobación

**APROBADO** significa que ese componente alcanza una semejanza suficiente con las referencias inspeccionadas. **NO ALCANZA** identifica una diferencia visible o una paridad que no pudo acreditarse con evidencia. El informe distingue explícitamente esas dos situaciones. La aprobación de UI no certifica profundidad de circuito; la aprobación de cámara no certifica física.

## Evaluación del juego integrado

Se abrió `http://localhost:5173/` en una pestaña propia de Chrome. Se evaluó a 1280 × 720 píxeles CSS, formato 16:9 equivalente a las referencias. Se recorrieron menú, configuración, partido, las cámaras cercana y táctica, pausa con Escape y ayuda. Se observaron saque, rallies y cambios de marcador. Durante esta revisión hubo actualizaciones de desarrollo que reiniciaron la partida; no se atribuye ese reinicio al juego compilado.

La primera revisión encontró dos problemas de lectura: controles inferiores sobre el fondo cercano y postes delanteros cruzando la acción. Se pidió un solo ajuste conjunto de encuadre. El resto se registró sin frenar la entrega. La captura final `outputs/partido-final.png`, tomada por el agente principal con CUA, fue abierta e inspeccionada independientemente mediante `view_image`: confirma los cuatro jugadores completos, frente desvanecido, pista libre y controles debajo.

| Ítem | Dictamen | Observación contra TE4 y alcance |
|---|---|---|
| Cancha de pádel y equipamiento | **APROBADO** | Pista azul, líneas, red de malla, cerramiento, accesos y palas forman una cancha de pádel reconocible. La terminación general de la geometría alcanza una semejanza suficiente con R1/R5, adaptada al pádel. No es una certificación dimensional. |
| Texturas y materiales | **NO ALCANZA** | La pista tiene variación fina y el vidrio permite ver. R1/R2 añaden materiales de ropa, equipamiento y entorno más diferenciados. Aquí abundan superficies uniformes, especialmente en personas y tribunas. Priorizar ropa y palas; el piso ya funciona. |
| Iluminación y sombras | **APROBADO** | Sombras de contacto, iluminación sobre la pista y gradas más oscuras dan volumen y profundidad. La lectura alcanza el objetivo funcional observado en R1/R2, aunque la escena es más estilizada. |
| Estadio y público | **NO ALCANZA** | Hay gradas, asientos y público abundante. Los espectadores repiten siluetas cilíndricas sin brazos ni poses sentadas. R1/R2/R5 muestran personas reconocibles y mayor detalle de estadio. La falta es de silueta y variedad; no hace falta aumentar cantidad. |
| Jugadores y palas | **NO ALCANZA** | Se distinguen cuatro jugadores, ropa de equipos y palas perforadas. La anatomía y los detalles de ropa/manos siguen simplificados frente a R2/R3. Hace falta un modelo humano articulado consistente para acercamientos. |
| Animación | **NO ALCANZA** | Hay cambios de pose y desplazamientos durante saque y rally. La evidencia disponible no acredita continuidad, apoyos, transferencia de peso ni contacto pala-pelota al nivel de TE4. No se aprobó animación usando únicamente poses estáticas. Requiere comparar secuencias y ajustar el contacto. |
| Cámara y pelota | **APROBADO** | La captura final de transmisión muestra toda la pista, cuatro jugadores completos y pelota amarilla reconocible. Los postes delanteros se desvanecen y los controles quedan debajo de la pista. La cámara táctica también se revisó con cancha completa. La legibilidad y perspectiva son suficientemente cercanas al criterio R1/R5; no se exige copiar exactamente su zoom. El ajuste final de cámara cercana no se volvió a recorrer completo: la aprobación final se apoya en transmisión y táctica. |
| Menú, selección y circuito | **APROBADO EN PRESENTACIÓN** | Menú, configuración, selección de pareja y tres escenarios tienen jerarquía y estilo consistentes. Español claro y navegación visible. La calidad de presentación alcanza R3/R4 sin copiar su diseño. Esta aprobación no equipara profundidad de carrera/circuito con TE4. |
| HUD, ayuda y pausa | **APROBADO EN PRESENTACIÓN** | Marcador de parejas legible, golpe seleccionado, velocidad, ayuda de seis golpes y pausa funcionan en la navegación observada. Los paneles tienen consistencia visual comparable a TE4. La captura final confirma controles desde el borde inferior y aviso de saque fuera de la cancha. El resultado final no fue alcanzado en esta revisión visual. |
| Física y reglas | **NO ALCANZA COMO PARIDAD TE4; BASE FUNCIONAL VERIFICADA** | El equipo de física reportó 16 pruebas aprobadas: gravedad/trayectoria, vidrio tras pique frente a contacto directo, doble pique, doble falta, saque bajo diagonal tras pique, seis golpes diferenciados, entrenamiento, partido entero de IA, remate por tres y Star Point. Se observaron rallies y avance del marcador en navegador. Esto acredita una base jugable, no el tacto, contactos, táctica y profundidad de simulación de TE4. |
| Sonido | **NO ALCANZA EN RECURSOS; ESCUCHA SIN VERIFICAR** | `game/audio.ts` sintetiza impactos y ambiente con oscilador y ruido filtrado. Tiene paneo, volumen y silencio. No incluye grabaciones diferenciadas de zapatillas, voces ni un público comparable al de un simulador comercial. No se realizó escucha perceptual real con estas herramientas: no se afirma que sature o suene mal. |

## Evidencia visual propia

Capturas reales obtenidas con el navegador; ninguna fue generada o retocada:

- [Partido final, corrección de encuadre verificada](outputs/partido-final.png). Capturado por el agente principal; inspección visual independiente en esta revisión.
- [Menú](/tmp/premier-padel-visual-audit/menu.jpg).
- [Configuración](/tmp/premier-padel-visual-audit/configuracion.jpg).
- [Cámara cercana, antes del ajuste de postes](/tmp/premier-padel-visual-audit/camara-cercana.jpg).
- [Cámara táctica](/tmp/premier-padel-visual-audit/camara-cenital.jpg).
- [Pausa](/tmp/premier-padel-visual-audit/pausa.jpg).
- [Ayuda y controles](/tmp/premier-padel-visual-audit/controles.jpg).

## Orden de mejora después de la entrega

1. **Contacto y animación del jugador:** conectar pies, centro de masa, pala y pelota. Diferenciar saque bajo, bandeja, víbora y remate visualmente.
2. **Tacto de juego y táctica de dobles:** balancear timing, colocación, riesgos y decisiones de IA. Probar puntos humanos completos, además de escenarios automáticos.
3. **Modelos y materiales humanos:** ropa, silueta y manos; después variar espectadores y poses sentadas.
4. **Sonido grabado y mezcla:** muestras propias de pala, pique, cristal, malla, zapatillas y público; ajustar con escucha real.
5. **Profundidad del circuito:** progresión, presentación de resultados y variedad de arenas. La UI base ya permite extenderlo.

El juego ya tiene un recorrido integrado. El conjunto visual todavía no iguala TE4: los mayores saltos pendientes están en personas, animación y público. La aprobación de componentes concretos no debe presentarse como aprobación global.
