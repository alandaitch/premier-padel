# Renderer V9 — pista compacta y exterior gris

Se inspeccionó la fotografía de estadio adjunta por Alan y el renderer del commit V7 `815a821`. La referencia muestra una pista azul compacta, circulación gris oscura y gradas próximas. V7 y V8 compartían el mismo error visual: la zona exterior usaba una copia del material de césped. No se recuperó ese material antiguo; se separó la apariencia del suelo de las dimensiones físicas permitidas.

## Superficie

- Pista azul: **10 × 20 m**, sin cambios de medidas, líneas, red o cristales.
- Dos parches azules de acceso: **0,6 × 3 m**, uno por lateral, junto a las puertas.
- Azul total: **203,6 m²**, frente a **424 m²** del renderer V8; reducción del **52 %**.
- Exterior: pavimento gris carbón, con variación granular neutra. Se retiraron los bordes azules que parecían delimitar otra cancha.
- Recuperación conservada íntegramente: **8 m de ancho y 14 m de largo por lado**, en `5 ≤ |x| ≤ 13`, `|z| ≤ 7`. El color no modifica ni restringe el movimiento.

## Gradas y bancos

| Elemento | V8 | V9 |
| --- | --- | --- |
| Centro primera fila de fondo | z = −15,6 m | z = −13,1 m |
| Centro primera fila lateral izquierda | x = −14,6 m | x = −13,9 m |
| Centro primera fila lateral derecha | x = +16,1 m | x = +15,45 m |
| Sectores cercanos a las esquinas | No existían | primera fila x = ±9,7 m, centros z = ±9,5 m |
| Bancos de ambos equipos | x = +13,85 m; z = ±5,8 m | Conservados |

Las gradas laterales centrales ocupan `|z| ≤ 8,2`. Los sectores cortos de las esquinas ocupan `8,4 ≤ |z| ≤ 10,6`, por fuera del rectángulo de recuperación. Se separaron los sectores para evitar que una grada elevada enterrara asientos de otra fila. La ruta de presentación alrededor del fondo, en `|z| = 11,35`, mantiene **75 cm** hasta el bloque de esquina más próximo.

El borde interior del bloque lateral izquierdo queda en `|x| = 13,47`; su baranda queda en `|x| = 13,375`. Ninguno invade el límite exterior de 13 m. A la derecha, la primera grada empieza en x = 15,02 y deja espacio detrás del banco y su ventilador. Ambos bancos siguen en el mismo lateral físico, con sus posiciones y animaciones ya verificadas.

## Validación

- TypeScript y lint del renderer pasan.
- Comprobación geométrica de **49 bloques de grada**: cero intersecciones con ambos rectángulos completos de recuperación exterior.
- Proyección con la cámara de comparación 1600 × 900, a 20 m de altura: las cuatro esquinas de pista y los dos bancos entran en cuadro.
- Inspección visual real en el navegador: pista azul compacta, circulación gris y bancos derechos visibles. El revisor independiente comparó V8 y V9 con la misma cámara y aprobó esta corrección sin solicitar otra iteración.
- Cámaras de juego, recuperación exterior y descanso conservadas. La grabación comparativa usa la misma trayectoria y cámara para V8 y V9.
- La inspección visual y las nuevas grabaciones se realizan en `work/v9-recordings`; las tomas anteriores permanecen intactas.

La distribución es una interpretación procedural de la fotografía, no un levantamiento medido del recinto real. No se modificaron física, UI, audio, indumentaria ni animaciones en esta revisión. No se borró ni sobrescribió ningún video.
