# Física, táctica y entrenamiento · V8

## Cambios jugables

La subida deja de depender del nombre del golpe. Un globo alto pero corto mantiene a los defensores en el fondo. Para ganar la red, la trayectoria tiene que superar la línea rival y obligar a una recepción profunda. Una bandeja alcanzable permite conservar la posición ofensiva y recuperar la red con el compañero.

La chiquita se lee en dos momentos: una pelota descendente por debajo de la red y próxima al receptor permite aproximarse; una devolución baja que sale hacia arriba permite continuar. Una chiquita flotante no activa esa transición. El rival mantiene su línea de volea frente a bolas profundas, en lugar de correr automáticamente hasta la cinta. Si la devolución supera a la pareja que avanza, vuelve a defender el vidrio.

El sacador corre para incorporarse a su compañero. Las parejas recuperan una profundidad compartida, ajustan la cobertura lateral hacia la pelota y conservan la aceleración, velocidad, separación corporal y rutas físicas existentes. La recuperación exterior sigue pasando por las puertas reales. El sistema permite desviarse con movimiento manual.

Los errores de la IA también consideran distancia de contacto, velocidad de desplazamiento y pelota baja. No se cambian resultados del marcador para acortar un peloteo.

## Catálogo de entrenamiento

`TRAINING_DRILLS`, `TrainingDrill`, `TrainingDrillId` y `TrainingFeed` se exportan desde `game/physics.ts`. Cada entrada tiene `id`, `label`, `description`, `targetShot`, `feedBehavior`, y opcionalmente `smash` y `waitWall`.

| ID | Objetivo | Alimentación |
| --- | --- | --- |
| libre | Peloteo libre | Saque rival normal |
| saque | Saque de abajo | Servidor humano; caída, pique y contacto originales |
| plano | Derecha / revés | Pelota con pique delante del defensor |
| volea | Volea | Pelota para contacto antes del pique en la red |
| globo | Globo | Pelota con pique desde el fondo |
| bandeja | Bandeja | Globo descendente |
| vibora | Víbora | Globo descendente |
| remate | Traérmela | Globo corto; variante retorno |
| remate-por3 | Por 3 | Globo corto; variante por3 |
| remate-por4 | Por 4 | Globo próximo a la red; variante por4 |
| remate-alto | Paralelo alto | Globo próximo a la red; variante alto |
| dejada | Dejada | Pelota cómoda en la red |
| chiquita | Chiquita | Pelota con pique desde el fondo |
| bajada | Bajada de pared | Pelota profunda con salida alta del vidrio |
| contrapared | Contrapared | Pelota profunda para defensa con el propio vidrio |
| pared | Salida de pared | Pique y un vidrio |
| doble-pared | Doble pared | Pique y dos vidrios |
| rescate | Recuperación exterior | Por 3 rival; correr por puerta y contactar afuera |

Las alimentaciones preparadas usan `solveTrajectory` y los mismos contactos, colisiones y reglas del partido. No editan poses. El rescate usa un remate real del rival. Cada ejercicio vuelve a empezar mediante el ciclo normal de entrenamiento, sin sumar puntos al marcador. Los IDs anteriores siguen siendo válidos.

La interfaz debe convertir `targetShot: 'saque'` a Input `shot: 'plano'` para el servicio, y `null` permite selección libre. Puede preseleccionar la variante de remate y la intención de esperar pared. El catálogo indica el objetivo; no fuerza el golpe elegido por la persona.

## Fuentes primarias revisadas

- [LTA: saque](https://www.ltapadel.org.uk/play/padel-tips-and-techniques/serve/): el saque construye la llegada a la red; importa colocación, velocidad y cobertura del centro.
- [LTA: bandeja y remate](https://www.ltapadel.org.uk/play/padel-tips-and-techniques/overheads-bandeja-and-the-smash/): la bandeja controla el globo y permite recuperar la red junto al compañero. Contacto aproximadamente a la altura de los ojos.
- [The Padel School y Manu Martín: cuándo avanzar](https://thepadelschool.com/padel-tips/when-to-move-forward-in-padel): aproximación coordinada, lectura del tiempo disponible y frenado cuando golpea el rival. El modelo usa estas decisiones como criterio táctico, con umbrales simplificados.
- [The Padel School: chiquita](https://thepadelschool.com/padel-tips/use-the-chiquita): una pelota lenta a los pies debe obligar al rival a jugar hacia arriba. No toda selección de chiquita cumple ese resultado.
- [PadelMBA: clínica de defensa y ataque, páginas 1–4](https://www.padelmba.com/wp-content/uploads/2021/05/Bloques-Clinic-Marbella-EN.pdf): movimiento en pareja, progresión mediante chiquita, entrenamiento de bandeja/víbora/remate y soluciones al salir por la puerta.

Consulta: 5 de septiembre de 2026. Son criterios de entrenamiento, no medidas biomecánicas ajustadas a captura de movimiento.

## Verificación y límites

- 73 pruebas de física: reglas previas más lectura de globo corto/profundo, chiquita efectiva/flotante, subida del sacador, velocidad continua y 17 alimentaciones alcanzables mediante Input real.
- El catálogo cubre los diez golpes y el saque, las cuatro variantes de remate, vidrio/doble vidrio y rescate exterior. Los contactos del ejercicio de rescate se producen después de atravesar la puerta.
- Semilla interna 41927, exhibición normal con un juego objetivo y un set: final a aproximadamente 547,8 segundos simulados. Se observaron bandejas, globos, remates, voleas, víboras, bajadas, chiquitas y dejadas. El máximo fue 58 golpes; todavía hay peloteos largos.
- Las alimentaciones facilitan un contacto posible. No garantizan ganador, salida por 3/4 o remate perfecto independientemente de potencia, perfil, altura y ángulo.
- La decisión táctica sigue usando zonas y umbrales. No modela comunicación verbal entre jugadores ni anticipación aprendida de partidos.
- Las ventanas de contacto siguen asistidas; esta entrega no sustituye esa asistencia por un simulador biomecánico.
