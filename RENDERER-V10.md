# Renderer V10 — bancos cercanos y árbitro en el mismo lateral

Se inspeccionó la nueva fotografía proporcionada por Alan. Esta revisión corrige la composición del estadio: los bancos quedan próximos al vidrio, con la silla alta del árbitro entre ambos, todos sobre el lateral derecho. Las medidas siguientes corresponden al modelo del juego; no son un relevamiento del recinto fotografiado.

## Disposición

| Elemento | V9 | V10 |
| --- | --- | --- |
| Centro de bancos | x = 13,85 m | **x = 8 m** |
| Centros longitudinales de bancos | z = ±5,8 m | **z = ±5,8 m**, conservados |
| Distancia lateral vidrio–centro de banco | 8,85 m | **3 m** |
| Árbitro | Lateral izquierdo, x = −13,9 m | **Lateral derecho, x = 7 m; z = 0** |
| Primera fila lateral derecha | x = 15,45 m | **x = 10,6 m** |
| Primera fila lateral izquierda | x = −13,9 m | **x = −10 m** |
| Césped fuera de pista | Dos parches de 0,6 × 3 m | **Ninguno** |

La alfombra azul queda limitada a **10 × 20 m**, exactamente dentro de los cristales. El resto de la superficie es gris carbón. Los asientos azules se conservan, como en la fotografía.

La silla del árbitro tiene cuatro apoyos, escalera posterior, asiento elevado, respaldo, apoyabrazos y reposapiés. El asiento queda aproximadamente a **1,85 m**; la cabeza del árbitro alcanza **2,74 m**. Mira hacia la red desde el mismo lado que los entrenadores y jugadores sentados.

## Volúmenes coordinados con física

El ancho máximo de recuperación continúa siendo un parámetro del motor. No determina dónde se dibujan los bancos. El agente principal incorpora obstáculos reales y rutas alrededor de ellos mediante `game/arena-layout.ts`.

| Elemento | Volumen conservador acordado |
| --- | --- |
| Cada banco, accesorios y ocupantes | x = [7,2; 9]; z = centro + [−2,45; 3,25]; altura 1,7 m |
| Silla alta y árbitro | x = [6,55; 7,65]; z = [−0,65; 0,65]; altura 3 m |
| Gradas laterales derechas | x = [10,17; 16,13] |
| Gradas laterales izquierdas | x = [−15,53; −9,57] |
| Sectores longitudinales de ambas gradas | z = [−8,2; −1,6] y [1,6; 8,2] |

Las gradas y barandas dejan abierto el pasillo central **|z| < 1,6 m**. Así se puede rodear la silla y acceder al espacio exterior más lejano sin atravesar espectadores. Los bloques de hormigón alcanzan 3,52 m; el público llega aproximadamente a 4,65 m.

Las barandas sobresalen respecto de los bloques: borde derecho x = 9,925 y borde izquierdo x = −9,325, altura aproximada 1,05 m. Se comunicaron esas franjas al integrador de física para que el contacto no empiece recién en el hormigón.

La caja medida directamente sobre las geometrías Three.js de cada banco es menor: x = [7,507; 8,780], z = centro + [−2,186; 3,190], altura 1,224 m. La caja acordada con física añade margen para ocupantes. La silla por sí sola ocupa x = [6,56; 7,518], z = ±0,39, altura 2,45 m; el árbitro completa el volumen superior.

## Caminata, regreso y cámara

Las parejas circulan entre el vidrio y el mobiliario, por los carriles x = **5,6 y 6,15 m**. Los compañeros salen escalonados 0,52 s durante la caminata de ocho segundos. Quien terminó detrás de los bancos sale primero al pasillo central. Quien terminó fuera del lado opuesto rodea un fondo por z = ±11,35, después de acercarse al corredor lateral libre.

El regreso reutiliza la ruta segura en sentido inverso, incluso con cambio de extremos o con un destino exterior. El último tramo llega al asiento propio para permitir la transición de sentarse; no se usa ese tramo como ruta de juego activa.

Al acercar los bancos, la antigua cámara habría quedado dentro de la cancha mirando a través de la reja. Se trasladó a **x = 5,45 m**, completamente fuera del vidrio, manteniendo la conversación dentro del encuadre. No se modificaron las poses de golpe, celebración o descanso en este trabajo.

## Comprobaciones

- TypeScript y lint pasaron al ceder el renderer para la integración de animaciones V10.
- **112 rutas** combinando cuatro jugadores, cambio de lado, extremos invertidos y siete orígenes interiores/exteriores: cero intersecciones con silla, bancos ajenos o gradas, usando radio corporal de 0,22 m.
- Cajas del mobiliario medidas con `THREE.Box3` sobre la geometría construida.
- La inspección final de las capturas integradas corresponde al agente principal, después de incorporar los nuevos obstáculos y animaciones.

No se modificaron reglas físicas, UI, audio o perfiles. No se borraron ni sobrescribieron videos previos.
