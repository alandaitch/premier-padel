# Dinámica de pádel — decisiones para Premier Padel

Revisión: 4 de septiembre de 2026. Investigación primaria de reglas y enseñanza. Las recomendaciones de implementación son propuestas del equipo; no mediciones biomecánicas ni especificaciones de la FIP.

## Qué tiene que sentirse distinto del tenis

La pared cambia la decisión antes del contacto. Una pelota profunda puede dejarse pasar, rebotar y atacarse hacia delante. El globo permite disputar la red; las parejas se desplazan juntas. La preparación de pala debe ser corta. Estas son prioridades de juego, además del saque bajo y el cerramiento. [LTA: habilidades](https://www.ltapadel.org.uk/play/how-to-get-started-playing-padel/skills-for-beginners/), [LTA: táctica](https://www.ltapadel.org.uk/play/how-to-get-started-playing-padel/padel-match-tactics/).

## Reglas confirmadas

La versión FIP consultada declara aplicación desde el 1 de enero de 2026. Resumen normativo compacto:

| Referencia | Regla que determina el motor |
|---|---|
| 12.1; 13.1i/o | Alternan parejas. Ni jugador ni compañero pueden efectuar el siguiente golpe del mismo equipo. |
| 12.3; 13.1c | Vidrio y malla no suman piques de suelo; el segundo pique termina. |
| 13.1g; 14.1b/c | Antes de pared rival, suelo rival. Contravidrio propio permitido; malla propia, no. |
| 14.1g; 13.1a/f | Tras pique y retorno, el receptor puede alcanzar sobre la red. No tocar red, postes ni suelo rival. |
| 13.1d/e; 16 | Sin juego exterior, salida termina. Con autorización, lateral/puerta siguen hasta segundo pique u objeto ajeno. Fondo termina inmediatamente. |
| 6; 7; 8 | Saque: pique previo, contacto hasta cintura, apoyo terrestre, cuadro diagonal. Receptor espera pique. Dos intentos. |
| 7.1e; 9.1a | Saque válido seguido de malla: falta. Vidrio permitido. Red exige cuadro válido y ausencia de malla para repetir. |
| 1, opción 2 | En Star Point el receptor elige lado sin intercambiar posiciones. |

Fuente normativa: [FIP Rules of Padel 2026, páginas 10 y 14–19](https://www.padelfip.com/wp-content/uploads/2025/12/FIP_Rules-of-Padel-1.pdf).

Star Point se aplica en Premier Padel 2026. Tras dos ventajas neutralizadas, el siguiente punto decide el juego. No confundirlo con punto de oro inmediato. [Anuncio y explicación oficial de FIP](https://www.padelfip.com/2025/12/between-innovation-and-tradition-introducing-the-star-point-the-scoring-system-that-appeals-to-everyone/).

## Enseñanza primaria traducida a sensaciones

| Situación | Lectura de la fuente | Propuesta observable para el juego |
|---|---|---|
| Bola profunda | LTA recomienda usar el cristal para ganar tiempo y espacio. Una bola lenta obliga a acercarse más a él. | La ayuda debe permitir esperar pared. No interceptar automáticamente toda pelota antes del cristal. |
| Bola rebotada | LTA explica que el golpe acompaña una pelota que ya avanza hacia la red. | Giro lateral, preparación temprana, contacto por delante y recuperación hacia delante. |
| Globo y red | LTA presenta el globo como recurso para adelantar juntos a ambos jugadores. | Un globo superador cambia el estado táctico de las dos parejas; no sólo dibuja una parábola. |
| Doble pared | The Padel School recomienda anticipar el destino posterior a las paredes. | Predecir lateral→fondo y fondo→lateral. Elegir posición de recepción tras ambos contactos. |
| Bajada | The Padel School la define como ataque después del cristal. Hay que llegar detrás de la pelota. | Habilitar ataque alto sólo con rebote de pared y posición suficiente; no desde cualquier bola alta. |
| Chiquita | The Padel School enseña una bola lenta a los pies del voleador. Facilita subir juntos. | Objetivo dinámico cerca de los pies rivales, diferente de la dejada a pista vacía. |
| Bandeja y víbora | LTA describe la bandeja como golpe alto con corte. The Padel School presenta la víbora como ataque cortado exigente. | Bandeja favorece control y recuperación de red; víbora añade agresión y riesgo. No basta cambiar nombre y velocidad. |

Fuentes de enseñanza:

- [LTA: Six padel tips for beginners](https://www.ltapadel.org.uk/play/how-to-get-started-playing-padel/skills-for-beginners/).
- [LTA: Padel match tactics](https://www.ltapadel.org.uk/play/how-to-get-started-playing-padel/padel-match-tactics/).
- [The Padel School: Training corners and bajadas](https://thepadelschool.com/padel-tips/training-corners-and-bajadas).
- [The Padel School: Where to hit the bajada](https://thepadelschool.com/padel-tips/where-to-hit-the-bajada-the-padel-school).
- [The Padel School: Use the chiquita](https://thepadelschool.com/padel-tips/use-the-chiquita).
- [The Padel School: Improve your víbora](https://www.youtube.com/watch?v=LIlPZNxZLhs). Se consultó la descripción publicada; no se afirma haber analizado movimiento cuadro a cuadro del video.

## P0 — errores que cambiarían el deporte

Estado V2: las casillas marcadas indican implementación leída o casos automatizados específicos. No certifican sensación humana ni animación. La suite final de 27 pruebas, tipado y compilación fue ejecutada y confirmada por el agente principal. Este auditor leyó los casos nuevos y el código; no duplicó esa ejecución.

- [x] Conservar último equipo golpeador y receptor aunque la pelota vuelva sobre la red. Implementado mediante `lastHitter`, `incomingTeam` y `returnedToHitter`.
- [x] Separar piques de suelo, contactos de vidrio y retorno. Los ejercicios verifican un pique y uno/dos vidrios.
- [x] Comprobar equipo antes de aceptar contacto. Prueba del retorno rechaza al rematador y su compañero.
- [x] Habilitar alcance del receptor sobre la red tras retorno legal. La prueba conserva pies en campo propio y devuelve al campo del rematador. No hay detección completa de faltas de cuerpo/red.
- [x] Separar contacto físico y seguimiento visual. `contactPoint` registra el golpe; el renderer lo consume sin golpear nuevamente.
- [ ] Completar arbitraje de recuperación exterior y accesos. El modo actual termina la salida; no tiene juego exterior autorizado.
- [ ] Completar colisiones de poste/acceso/cuerpo. Vidrio y malla sí se distinguen, con alturas laterales/fondo diferentes.
- [x] Esperar desenlace del saque antes de let. Se probaron red→cuadro→malla como falta y red→cuadro→contacto receptor como repetición. Este último defecto fue detectado y corregido en la revisión.

Para “por tres” y “por cuatro”, registrar `exitBoundary` y `exitHeight`. La etiqueta comercial del golpe no sustituye la colisión geométrica. Si no se implementa recuperación exterior, declarar esa limitación en ajustes/ayuda. No presentarla como regla universal del pádel.

## P1 — decisiones que producen rallies de pádel

- [x] **Esperar pared:** `B` bloquea el contacto temprano y conserva movimiento manual. Prueba específica para doble vidrio.
- [x] **IA de paredes:** predice vuelo, tiempo de llegada y destino tras vidrio. La calidad táctica sigue simplificada.
- [x] **Doble pared:** predicción y ejercicio con dos vidrios, un pique y ventana de devolución humana verificada automáticamente. Falta acreditar visualmente ambos órdenes de esquina.
- [x] **Pareja:** selecciona receptor y destina al compañero a cobertura contraria.
- [x] **Red y fondo:** profundidad compartida; prueba del globo acredita avance conjunto y giro rival.
- [x] **Globo:** decisiones distintas según altura y posición. Parte de la selección todavía depende del número de golpes del rally.
- [x] **Bajada:** exige vidrio; sin éste se transforma en bandeja o plano. Prueba de elegibilidad y velocidades diferenciadas.
- [x] **Chiquita:** trayectoria más lenta y profunda que dejada; activa avance. El objetivo longitudinal sigue fijo, sin ajustarse a los pies reales del rival.
- [ ] **Potencia:** balancear premio, riesgo y rebote en partidos humanos. Existen retorno, por tres y por cuatro; sus trayectorias reciben asistencia.
- [x] **Fallos comprensibles:** captura real muestra “Doble pique”; código emite motivos de saque, red y salida.

## P2 — animación y comunicación

- [ ] Verificar en secuencia preparación, contacto y terminación. Código añadido: preparación, brazo articulado dirigido a `contactPoint` y recuperación.
- [ ] Verificar visualmente giro de defensa y apoyos. Código añadido: intención de pared/giro, pasos cortos, inclinación y seguimiento de cabeza.
- [ ] Verificar salto, alcance y aterrizaje del remate. Están programados, sin secuencia visual disponible.
- [ ] Verificar diferencias gestuales de bajada, chiquita, bandeja y víbora. Hay ramas específicas; no se aprueban por leerlas.
- [ ] Verificar identificación audiovisual de pared simple, doble pared y retorno. Cámara estática legible; escucha perceptual pendiente.
- [x] Añadir prácticas de peloteo, vidrio, doble pared y remate con selección de retorno/por tres/por cuatro. Bajada y chiquita están disponibles como golpes; no tienen ejercicio dedicado.

## Puerta de aceptación funcional

Resultado de la puerta funcional, limitado a los escenarios realmente cubiertos:

| Caso | Observación que hay que registrar |
|---|---|
| A remata; bola vuelve a A | Pruebas: sigue rally, receptor conserva turno, puede alcanzar y devolver; sin devolución gana al segundo pique. |
| A y compañero al alcance | Prueba rechaza contacto de ambos integrantes del equipo rematador. |
| Esperar vidrio | Pruebas de ventana humana tras vidrio y bloqueo previo. Secuencia visual completa pendiente. |
| Dos órdenes de pared | Ejercicio automatizado de dos vidrios aprobado. Cobertura explícita de ambos órdenes de esquina pendiente. |
| Bajada alta / salida baja | Elegibilidad funcional probada. Diferencia gestual pendiente de secuencia. |
| Chiquita contra pareja en red | Profundidad objetivo probada. Secuencia rival obligado a volear bajo y subida posterior pendiente. |
| Globo superador | Destinos y movimiento conjunto probados; decisión contextual sigue asistida. |
| Salida lateral / fondo | Tres remates probados desde globo de práctica. Recuperación exterior ausente. |
| Saque red, cuadro, malla | Prueba aprobada; contacto receptor tras red/cuadro repite sin puntuar. |
| Star Point | Pruebas de marcador previas conservadas. Selector de lado existe en código; interacción visual V2 no recorrida por este auditor. |

## Estado de la revisión de esta iteración

V2 aprobada como ampliación funcional específica de pádel: paredes, espera, retorno, pareja y golpes tienen reglas o trayectorias propias, además de sus nombres. Suite final: 27/27, tipado y build correctos, confirmados por el agente principal. No se declara equivalencia completa con TE4 ni cumplimiento de todo el reglamento profesional.

La captura `outputs/doble-pared-v2.jpg` fue inspeccionada directamente: permite aprobar interfaz y encuadre. Está en fase **PUNTO**, después de un doble pique; no demuestra el recorrido de dos paredes ni la animación del contacto. No se pudo ampliar la observación porque macOS estaba bloqueado. El [informe V2](PADEL-REVIEW-V2.md) distingue evidencia directa, pruebas, limitaciones y prioridades.
