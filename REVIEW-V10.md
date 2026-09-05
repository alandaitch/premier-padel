# Revisión visual V10

La disposición del estadio cumple la corrección solicitada. Las tomas finales permiten revisar bancos, rescates, víbora, remate y festejo sin los principales obstáculos de cámara iniciales. No apareció un bloqueo visual que requiera otra modificación de producto en esta entrega.

**Esto no equivale a alcanzar el realismo general de Tennis Elbow 4 o Virtua Tennis 4.** Los humanos, el público y las transiciones corporales siguen claramente estilizados. La víbora mejora sus fases reconocibles, pero su naturalidad técnica recibe una aprobación parcial.

## Alcance y evidencia

Se inspeccionaron fotogramas de los WebM realmente grabados, de 1600 × 900 píxeles. Las imágenes nuevas están en `outputs/qa-v10/checker/`. Se extrajeron con `ffmpeg -n`; no se borró ni sobrescribió ningún video o toma previa. Esta pasada no modificó código del producto ni operó la pestaña de grabación.

Las secuencias incluyen simulaciones del motor, repeticiones lentas y ejercicios preparados. Sus rótulos permiten diferenciarlas. La toma del pase entre puertas usa rivales pasivos: demuestra esa trayectoria, no la frecuencia con que aparece en un partido competitivo. Esta revisión por fotogramas no sustituye una prueba interactiva completa, una auditoría exhaustiva de colisiones ni una escucha de audio.

## Resultado por ítem

| Ítem | Toma final revisada | Dictamen y evidencia |
| --- | --- | --- |
| Estadio, suelo y cercanía de bancos | `estadio-arbitro-bancos-toma02.webm` | **Aprobado.** Azul limitado a la pista; exterior gris. Dos bancos próximos en el mismo lateral derecho, uno por mitad. Gradas detrás y silla alta entre ambos. `estadio-toma02-03s.jpg`. |
| Árbitro en silla alta | `arbitro-primer-plano-toma02.webm` | **Aprobado para ubicación y mobiliario.** Escalera, asiento elevado, respaldo y árbitro visibles junto a la red. El modelo humano del árbitro es muy básico. `arbitro-toma02-05s.jpg`. |
| Descanso y entrenadores | `banquillos-charla-toma02.webm` | **Aprobado visualmente.** Jugadores sentados con muslos continuos y pies plausiblemente apoyados; botellas sujetas, entrenador de pie gesticulando. Después vuelven a pista y los entrenadores quedan sentados. `banco-toma02-17-50s.jpg` y `banco-toma02-27s.jpg`. No se certifica la calidad audible de la charla. |
| Víbora | `vibora-tecnica-toma03.webm` | **Mejora funcional aprobada; fidelidad técnica parcial.** Se distingue preparación final con codo flexionado, descenso de mano libre, salida del golpe y terminación cruzada con giro. La cámara deja toda la acción libre. `vibora-toma03-08-40s.jpg`, `vibora-toma03-08-58s.jpg` y `vibora-toma03-08-85s.jpg`. El armado conserva demasiado componente vertical y el paso posterior resulta más amplio y aéreo que el barrido compacto de la referencia. |
| Remate | `remate-exhalacion-toma03.webm` | **Aprobado de lectura visual.** Mano, pala, pelota, cuerpo y salto entran completos durante el impacto y su salida. `remate-toma03-08-50s.jpg` y `remate-toma03-08-58s.jpg`. La exhalación no puede aprobarse mediante imágenes. |
| Guitarra de Paquito | `paquito-guitarra-toma02.webm` | **Aprobado como gesto reconocible.** Rodilla derecha baja, pie izquierdo adelantado, mano libre como mástil imaginario y pala junto a la cadera. El compañero ya no tapa las manos. Se ve la subida y el regreso a postura normal. `paquito-toma02-04-50s.jpg`, `paquito-toma02-06-40s.jpg`, `paquito-toma02-08-00s.jpg`. La expresividad y el rasgueo siguen simplificados. |
| Rescate exterior hacia la red rival | `rescate-puerta-red-toma02.webm` | **Aprobado en las muestras.** Golpe exterior y corredor visibles; pelota entra por el hueco, llega a la cara rival de la red y pica dentro. Bancos y silla no ocultan esa acción. `rescate-red-toma02-11-40s.jpg`, `rescate-red-toma02-12-45s.jpg`, `rescate-red-toma02-13-30s.jpg`. |
| Pase entre puertas | `rescate-puerta-paralelo-toma02.webm` | **Aprobado como ejercicio preparado.** Entrada desde el lateral derecho, pique dentro antes del lateral izquierdo y salida por la puerta opuesta. `rescate-paralelo-toma02-07-90s.jpg`, `rescate-paralelo-toma02-08-97s.jpg`, `rescate-paralelo-toma02-09-20s.jpg`. La pelota es pequeña pero contrastada. El jugador pasivo más cercano queda parcialmente recortado; no tapa la trayectoria evaluada. |

Las dimensiones documentadas en `RENDERER-V10.md` corresponden al modelo: centros de bancos x = 8 m, z = ±5,8 m; árbitro x = 7 m, z = 0; primera fila derecha x = 10,6 m. La fotografía no permite deducir esas medidas exactas. La aprobación visual se refiere a la disposición y proximidad solicitadas.

## Referencias realmente observadas

- Fotografía aportada por Alan: `codex-clipboard-ca037327-c608-4d87-b13a-6aac9d33406e.png`. Se revisó la imagen completa: pista azul compacta, pasillo gris, bancos próximos sobre el lateral derecho y público detrás.
- [Víbora en cámara lenta, the4Set](https://www.youtube.com/watch?v=wzJP9SfqjEQ). Fotogramas locales observados: 1,80 s, 2,12 s y 2,70 s. Las claves son base abierta, codo armado, pala retrasada junto a la nuca, mano libre que baja y barrido lateral con giro y transferencia del peso. No basta mantener las dos manos arriba.
- [Festejo de Paquito Navarro, Game, Set and Match](https://www.youtube.com/watch?v=3zVCJP2-jCI). Fotograma observado: 7,45 s. Rodilla derecha baja, izquierda adelantada, pala en la mano derecha junto a la cadera y brazo izquierdo extendido como mástil imaginario.

Estos dos clips son publicaciones de terceros, no fuentes oficiales de la federación. Se utilizaron para comparar gestos observables, sin copiar su audio ni incorporar el video al juego. Los archivos de referencia se conservan en `work/v10-references/`.

## Fallos detectados y resueltos en las tomas

1. Víbora y remate iniciales: cámara fuera del vidrio, con postes y travesaño sobre el golpe. La cámara interior de toma02 elimina esa obstrucción.
2. Paquito inicial: Guerrero se interponía entre cámara, pala y rodilla. Toma02 muestra el gesto completo desde el lado despejado.
3. Remate toma02: la pala salía por el borde superior durante el salto. Toma03 amplía el encuadre y permite observarla completa.

Las tomas descartadas se mantienen como evidencia de evolución. `takes.json` es el registro del integrador; esta revisión no lo modificó.

## Audio: comprobación limitada

Se confirmó una pista Opus estéreo de 48 kHz y señal no nula. En banco toma02, FFmpeg informó pico −18,4 dBFS y media −54,2 dBFS. En remate toma02, pico −18,0 dBFS y media −46,6 dBFS. No hay saturación digital en esas mediciones. La media incluye silencios y otros sonidos; no demuestra inteligibilidad ni volumen perceptivo adecuado.

Ambos WebM emitieron un aviso `Error parsing Opus packet header`, aunque decodificaron hasta 33,99 y 11,97 segundos respectivamente y terminaron con código 0. La integración verificó después los 18 MP4 convertidos: decodificación completa sin errores ni advertencias, registrada en `outputs/qa-v10/mp4-decode.json`. **No se escucharon los clips en esta auditoría**: no se aprueba el timbre de la conversación, el realismo de la exhalación ni su mezcla a partir de estos datos.

## Límites y orden de mejora

1. **Continuidad corporal de los golpes.** El armado de víbora aún es alto y rígido; la transición hombro–codo–muñeca y el apoyo posterior necesitan parecer un barrido continuo. Reducir el paso o salto excesivo según velocidad real de aproximación. Este es el límite más directamente relacionado con la técnica pedida.
2. **Modelos humanos, incluido el árbitro.** Cuellos, rodillas y codos conservan aspecto de piezas separadas; caras, pelo y tejido son demasiado simples. Los primeros planos todavía no alcanzan TE4/VT4, aunque los nombres y estampados se leen.
3. **Público y recinto.** Repetición marcada de poses, materiales homogéneos y bloques de gradas aislados. La disposición cumple la foto; la densidad y el ambiente no igualan un estadio real ni el acabado global de los referentes comerciales.
4. **Expresión y sonido de escenas.** Paquito comunica el gesto, pero la cara y el rasgueo son mecánicos. Revisar conversación y exhalación mediante escucha real, antes de afirmar que suenan naturales.

No se propone otra reconstrucción del estadio para cerrar V10. Los puntos anteriores quedan como trabajo posterior, conservando esta versión y sus videos comparables.
