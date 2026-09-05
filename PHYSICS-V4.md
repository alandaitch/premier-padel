# Física V4 · Premier Padel

La pelota ahora integra gravedad, resistencia del aire y efecto Magnus. Su rotación es un vector. Piso, vidrio y malla comparten un modelo de contacto pasivo. El golpe aporta la energía inicial; los rebotes sólo la redistribuyen y disipan.

Se eliminaron `smashKick`, el giro lateral aplicado directamente a la velocidad y las restituciones del piso elegidas por nombre de golpe. Un remate vuelve mediante pique, contacto con vidrio y vuelo real. No recibe un impulso especial al tocar la pared.

## Fuentes y qué se puede afirmar

| Parámetro               | Valor implementado                    | Procedencia y límite                                                                                                    |
| ----------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Diámetro                | 6,6 cm                                | Dentro de 6,35–6,77 cm, reglas FIP.                                                                                     |
| Masa                    | 57,7 g                                | Dentro de 56,0–59,4 g, reglas FIP.                                                                                      |
| Caída de calibración    | 2,54 m; rebote aproximado 1,40–1,42 m | FIP exige 1,35–1,45 m sobre superficie dura. La prueba usa alturas del centro de la esfera; no constituye homologación. |
| Gravedad                | 9,81 m/s²                             | Aproximación terrestre constante.                                                                                       |
| Densidad del aire       | 1,21 kg/m³                            | Valor empleado por Cross/Stepanek. No cambia con altitud o temperatura.                                                 |
| Coeficiente de arrastre | 0,55                                  | Aproximación basada en pelota de tenis con fieltro, no medición de pelota de pádel.                                     |
| Sustentación            | `CL = 1 / (2,022 + 0,981 v / vSpin)`  | Ajuste experimental de Cross/Stepanek para tenis. Se usa sólo la componente de giro perpendicular al vuelo.             |
| Momento de inercia      | `I = (2/3) m R²`                      | Esfera hueca delgada idealizada; no medición de la distribución de masa real.                                           |
| Pérdida de giro en aire | 0,12 s⁻¹                              | Aproximación de calibración jugable, sin medición específica de pádel.                                                  |

Fuentes primarias consultadas:

- [Reglamento FIP 2026](https://www.padelfip.com/wp-content/uploads/2025/12/FIP_Rules-of-Padel-1.pdf): dimensiones, pelota, saque y reglas de contacto. La banda de rebote citada es para superficie dura; no especifica la respuesta dinámica del césped.
- [Cross/Stepanek, apéndice sobre aerodinámica](https://www.physics.usyd.edu.au/~cross/PUBLICATIONS/10.%20StringFriction.PDF): fuerzas de arrastre y sustentación medidas con pelotas de tenis. La serie de giro llega aproximadamente a 340 rad/s; extrapolar a pádel y a mayor giro es una aproximación.
- [Cross, Ball Trajectories](https://www.physics.usyd.edu.au/~cross/TRAJECTORIES/42.%20Ball%20Trajectories.pdf): resistencia cuadrática, efecto Magnus y órdenes de magnitud del giro en tenis.
- [Cross, Bounce of a spinning ball near normal incidence](https://www.physics.usyd.edu.au/~cross/PUBLICATIONS/31.%20Spin.pdf), _American Journal of Physics_, DOI 10.1119/1.2008299: intercambio entre giro y traslación durante el contacto. Sus superficies experimentales no son una pista de pádel.
- [Cross, Grip-slip behavior of a bouncing ball](https://physics.usyd.edu.au/~cross/Gripslip.pdf): limitaciones de representar una pelota deformable mediante fricción y rodadura ideales.
- [LTA, bandeja y remate](https://www.ltapadel.org.uk/play/padel-tips-and-techniques/overheads-bandeja-and-the-smash/): contacto de bandeja aproximadamente a altura de ojos, menor ritmo para recuperar red y remate alto cerca de la red.
- [LTA, táctica de pádel](https://www.ltapadel.org.uk/play/how-to-get-started-playing-padel/padel-match-tactics/): posición de pareja, uso del vidrio y transición a la red.

No se encontró una serie primaria suficiente para calibrar restitución y fricción de pelota de pádel contra vidrio y césped concretos. Los valores siguientes son **supuestos explícitos**, no parámetros medidos del circuito.

## Contactos de materiales

| Superficie                                | Restitución normal inicial | Fricción |
| ----------------------------------------- | -------------------------: | -------: |
| Dura, para calibración de caída           |                      0,768 |     0,30 |
| Césped                                    |                      0,750 |     0,55 |
| Vidrio                                    |                      0,768 |     0,22 |
| Malla                                     |                      0,480 |     0,65 |
| Red, disponible en el modelo de contactos |                      0,120 |     0,75 |

La restitución disminuye 0,004 por cada m/s de velocidad normal por encima de 7 m/s, hasta un mínimo del 50 % del valor inicial. Es una aproximación de disipación dependiente de velocidad. Todos los golpes usan la misma función.

El contacto calcula la velocidad de deslizamiento de la superficie de la pelota: `v + ω × r`. El impulso normal invierte y reduce su componente normal. El impulso tangencial se opone al deslizamiento y está limitado por fricción de Coulomb. Se actualizan simultáneamente velocidad y giro usando el momento de inercia de la esfera.

Esto permite que una pelota con exceso de topspin salga del piso con mayor velocidad horizontal. La energía proviene de su rotación: la suma de energía cinética lineal y angular nunca aumenta. Sobre vidrio, la orientación del giro modifica la salida lateral y vertical por el mismo mecanismo.

La red todavía usa una respuesta simplificada de frenado y cinta en la lógica del partido. El material `net` está probado como contacto pasivo, pero no reemplaza esa lógica. No se simula una red deformable ni la estructura individual de la malla.

## Vuelo y golpe asistido

El integrador de punto medio calcula gravedad, arrastre proporcional al cuadrado de la velocidad y Magnus perpendicular a giro y vuelo. La previsión de la IA utiliza las mismas fuerzas y contactos.

La pala sigue siendo asistida: el jugador elige golpe, dirección y potencia; el motor resuelve una velocidad inicial que apunta al objetivo. No se simula todavía el choque completo pala–pelota, la velocidad de la mano ni la rigidez de cada pala.

Para los remates, el asistente explora trayectorias iniciales usando exactamente el modelo físico del partido. Escoge una que permita el resultado pedido cuando la posición y potencia lo permiten. Después del contacto no corrige la trayectoria. El por 3 combina giro inclinado, piso y vidrio; el por 4 usa una trayectoria empinada que supera el fondo tras pique válido. La contrapared también debe viajar físicamente contra el vidrio propio antes de cruzar.

Las velocidades angulares iniciales son ajustes de técnica, no datos medidos de jugadores profesionales. La bandeja usa aproximadamente −150 rad/s de corte; la víbora −230 rad/s y un componente lateral; el por 3 combina topspin y giro inclinado. El remate de retorno se lanza esencialmente plano. La fricción del piso genera rotación antes del vidrio.

Se corrigió un defecto del asistente: antes priorizaba un retorno bajo y reducía la velocidad incluso al cargar potencia. En el globo natural del ejercicio, con Tapia de 1,79 m, potencia 0,35 / 0,68 / 1 produce aproximadamente **92 / 115 / 137 km/h al contacto**. Un retorno fuerte puede cruzar muy por encima de la red. No se obliga a que siempre quede a la altura de una volea rival.

## Jugadores y táctica

El alcance depende de la estatura, con salto máximo del remate de 0,65 m. La bandeja tiene una ventana independiente: techo `0,94 × altura + 0,38 m`, aproximadamente 2,06 m para Tapia y 2,13 m para Galán. No utiliza el techo alto del remate. La víbora admite un contacto algo mayor.

`playingSide` define la recuperación izquierda/derecha mirando hacia la red. Tapia recupera el revés; Coello, el drive. La rotación diagonal del saque se conserva. `handedness` y `height` también quedan disponibles para el renderer.

La elección de golpe de la IA ya considera altura, profundidad, posición de rivales, comodidad del contacto y salida de pared. Se eliminó la selección por número de golpe del rally. La chiquita apunta delante de los pies del rival seleccionado y adapta su profundidad cuando éste se mueve. Un globo mal centrado puede quedar largo; no todos los errores se convierten en una reducción vertical idéntica.

Se corrigió una decisión que descartaba aéreos: si un globo profundo tenía pared prevista, la IA esperaba el vidrio aunque pudiera interceptarlo. Ahora busca primero un contacto descendente alcanzable y reserva 0,13 s para llegar y armar. Si no llega, conserva la defensa de pared. Para preparar el overhead, coloca el cuerpo detrás de la pelota.

El globo de la IA también depende del equilibrio: velocidad de desplazamiento y altura de contacto determinan su profundidad asistida, entre 5 y 8,4 m. Un golpe bajo mientras corre puede quedar corto y permitir un remate. Esta heurística no es una medición biomecánica; crea errores por contexto sin programar una secuencia de golpes ni cambiar las fuerzas.

La simulación normal produjo 92 contactos aéreos y dos retornos; la difícil, 98 aéreos. Son observaciones de dos partidos deterministas, no una distribución validada contra pádel profesional. Sigue pendiente diversificar patrones, valorar mejor el riesgo y cerrar más puntos por posición.

## Verificación

37 pruebas pasan. Incluyen:

- Banda de caída FIP a 120 Hz y 1000 Hz: aproximadamente 1,418 m y 1,404 m.
- 500 contactos con velocidades, giros, normales y materiales variados: sin aumento de energía cinética total.
- Conversión de giro en traslación; efecto contrario de slice y topspin.
- Desvío opuesto del vidrio con giros opuestos.
- Arrastre, Magnus y convergencia del vuelo entre 60 Hz y 240 Hz.
- Trayectoria asistida compensada por aire.
- Pared, doble pared, contrapared y conservación del único pique permitido.
- Retorno real del remate, recepción legal sobre la red y prohibición del segundo golpe de la pareja rematadora.
- Por 3 y por 4 desde un globo de práctica interceptado naturalmente.
- Alcance de jugadores de distinta estatura, chiquita móvil y respuesta creciente a la potencia.
- Saque diagonal, segundo saque, let pendiente, Star Point, tie-break y partido completo. La prueba del partido también exige remate y bandeja/víbora decididos por la IA, junto con defensa de vidrio.

Simulaciones adicionales con `matchAppearances()`, `autoPlay:true`, tres games y un set:

| Dificultad | Resultado         | Tiempo simulado | Puntos | Rally máximo |
| ---------- | ----------------- | --------------: | -----: | -----------: |
| Normal     | Partido terminado |        444,53 s |     20 |    58 golpes |
| Difícil    | Partido terminado |        469,96 s |     17 |    78 golpes |

Tramo continuo reproducible para revisión visual: normal, desde **10,5 s**, duración **40 s**. Avanzar 1260 pasos de 1/120. Contiene 51 golpes, diez contactos con vidrio, cinco remates y tres víboras. El remate de Coello a 26,833 s vuelve por encima de la red a 28,642 s. Hay un punto y el comienzo del siguiente; no hay edición de estados ni montaje de jugadas. Otra ventana, normal 88,5–128,5 s, incluye bandeja, víbora y remate. El script local está en `work/segment-v4.ts` y sus resultados en `work/segment-v4-results.json`.

## Límites y siguiente mejora

La calibración prueba consistencia y jugabilidad; no valida fidelidad contra captura experimental de pádel. El paso fijo detecta el contacto al final del intervalo y corrige posición, en lugar de resolver exactamente el instante de impacto. Esto explica parte de la diferencia de altura entre 120 Hz y 1000 Hz.

Orden recomendado: mejorar decisiones y distribución de golpes de la IA; medir pelota real contra césped/vidrio para ajustar fricción y restitución; resolver el instante exacto de colisión; modelar pala, red y deformación con mayor detalle. La salida exterior lateral continúa configurada sin recuperación fuera de pista. Las colisiones de cuerpo, contactos con red del jugador y faltas de pie no tienen una simulación exhaustiva.
