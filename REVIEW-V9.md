# Revisión V9 · reja y proporciones del estadio

Auditor independiente: `v9_checker`. Fecha: 5 de septiembre de 2026.

## Alcance y referencia

Se inspeccionó la fotografía adjunta por Alan: `codex-clipboard-3c33da0d-1353-45f8-ad54-e7c32c5e3ea3.png`. Muestra una pista azul claramente delimitada, una franja perimetral oscura y tribunas próximas a esa franja. La perspectiva de una sola fotografía no permite aprobar medidas exactas del estadio.

Como antecedente se vio el fotograma conservado de V8 `outputs/visual-audit-v8/banco-final-video-23s.jpg`. Los grandes rectángulos azules laterales ocupan gran parte del espacio entre pista y tribunas; los bancos están en el mismo lateral derecho. Esa imagen acredita el defecto señalado por el usuario y queda conservada.

La revisión V9 se limita a la alfombra exterior compacta, el suelo exterior oscuro, la cercanía de las tribunas y la continuidad de puertas, recuperación exterior y bancos. No reabre el trabajo de modelos humanos, kits, biomecánica ni un benchmark general contra Virtua Tennis.

## Criterios de aceptación

- El azul exterior debe ocupar un área pequeña, independiente del espacio donde el jugador puede correr.
- El resto del exterior debe leerse oscuro y distinguirse claramente de la pista.
- La tribuna lateral debe acercarse perceptiblemente sin cruzar zonas transitables, jugadores o bancos.
- Los dos bancos deben seguir juntos en el mismo lateral físico, uno por semipista.
- Debe existir un sonido diferenciado para el impacto en reja, separado de cristal y red. Una lectura de código o una forma de onda no permiten afirmar cómo se percibe al oído.

## Comparación integrada antes de grabar

El integrador confirmó el reinicio del servidor de inspección en el puerto5189, con el renderer congelado. En Chrome se abrió `work/v9-recordings/index.html?clip=0` para V9 y `?clip=1` para el renderer V8 archivado. Se compararon el mismo estado de partido y la misma cámara al tiempo0. El inspector dice explícitamente que se trata de una repetición preparada, no una partida humana.

| Ítem | Dictamen observado |
| --- | --- |
| Azul exterior | APROBADO. Desaparecen los rectángulos laterales grandes. Sólo queda un pequeño umbral azul delante de las puertas. |
| Suelo exterior | APROBADO. Gris carbón continuo, visualmente separado de la pista azul. La diferencia no depende de una cámara más cercana: se comparó el mismo encuadre. |
| Cercanía de tribunas | APROBADO para esta corrección. Los sectores de esquina se aproximan claramente y el fondo se acerca. El centro lateral conserva espacio amplio para recuperar; no se afirma reproducción exacta de la arena de la fotografía. |
| Bancos | APROBADO en muestra. Ambos permanecen en el lateral físico derecho. En el inspector de modelos, Banco50% con cámara asentada muestra asientos, jugadoras, entrenador y ventilador despejados; no se observó intersección con la nueva tribuna. |

La inspección estática complementaria comprobó que no cambia la zona exterior del motor: hasta8m desde el lateral y hasta7m desde la red. Los sectores de esquina empiezan a8,4m desde la red; el retorno preparado pasa a11,35m, más allá del extremo de esos bloques a10,6m. Son comprobaciones de posiciones del código, no una prueba exhaustiva de toda trayectoria del jugador.

No se encontró un defecto material que requiriera otra iteración del renderer antes de grabar.

## Evidencia de los videos finales

Se decodificaron y observaron seis fotogramas de los WebM realmente guardados. No se confunde este muestreo con la reproducción completa de los siete clips ni con una prueba perceptual de sonido. FFmpeg escribió imágenes nuevas usando `-n`.

| Archivo y tiempo | Evidencia | Resultado |
| --- | --- | --- |
| `estadio-despues.webm`,7s | [V9 a7s](outputs/visual-audit-v9/estadio-v9-7s.jpg) | APROBADO: pista y umbrales azules compactos, piso exterior gris y gradas próximas en esquinas. |
| `estadio-antes-v8.webm`,7s | [V8 a7s](outputs/visual-audit-v9/estadio-v8-7s.jpg) | Comparación con la misma jugada y cámara: el azul lateral grande y la distribución anterior quedan documentados. |
| `exterior-recuperacion.webm`,3s | [Exterior a3s](outputs/visual-audit-v9/recuperacion-v9-3s.jpg) | APROBADO: jugador fuera de pista, sobre gris, separado del banco y de la esquina de tribuna. |
| `exterior-recuperacion.webm`,4s | [Exterior a4s](outputs/visual-audit-v9/recuperacion-v9-4s.jpg) | APROBADO: continúa fuera, acercándose a la puerta; el suelo gris no funciona como barrera visual ni física. |
| `banquillos-estadio.webm`,14s | [Banco a14s](outputs/visual-audit-v9/banco-v9-14s.jpg) | APROBADO: dos jugadores sentados, botella en mano y entrenador delante; tribuna y ventilador no atraviesan cuerpos. |
| `banquillos-estadio.webm`,24s | [Regreso a24s](outputs/visual-audit-v9/banco-v9-regreso-24s.jpg) | APROBADO: cuatro jugadores cerca de las puertas, bancos derechos separados por semipista, pasillo despejado. |

Los tiempos son posiciones de lectura de los archivos. La continuidad de cada paso no se acredita mediante dos fotogramas: éstos complementan la comprobación estática del área libre y la inspección del banco en navegador.

## Audio: hallazgo de integración

La revisión de código detectó un caso omitido: una devolución desde fuera que golpeaba la cara exterior de la reja terminaba el punto sin registrar el impacto metálico. Se comunicó al responsable de audio y quedó corregido antes de la grabación final.

Se leyó la corrección y su prueba: el caso exterior conserva `eventType='point'`, registra `meshImpactId=1` y velocidad normal5m/s. La interfaz consume este registro por separado, por lo que el desenlace del punto no borra el impacto. También se inspeccionó el resultado de la suite integrada:109 pruebas aprobadas. La síntesis usa ataque corto, vibración irregular y resonancias separadas de cristal/red.

La revisión perceptual del timbre no está acreditada por este auditor: no se presenta la lectura del sintetizador como una audición. Las capturas nuevas permiten a Alan evaluar ese timbre. Este límite de evidencia no impide aprobar las correcciones visuales ni el funcionamiento registrado del disparador sonoro.

## Dictamen final

APROBADO el alcance visual solicitado: azul exterior pequeño, perímetro oscuro y tribunas más próximas, conservando recuperación exterior y ambos bancos en el mismo lateral. El caso omitido de impacto exterior contra reja se detectó y corrigió; la integración sonora tiene prueba funcional.

No quedan cambios solicitados por esta auditoría. La distribución continúa siendo procedural y el centro lateral mantiene amplitud para correr8m; no se afirma una réplica dimensional del estadio de la foto ni paridad visual general con otro videojuego.

No se modificó producto ni se borró o sobrescribió ningún video durante la auditoría.
