# Obstáculos exteriores V10

## Geometría compartida

`game/arena-layout.ts` define el dominio exterior y sus sólidos.

- El dominio conserva `x = -13..13` y `z = -7..7`.
- Los bancos ocupan `x = 7.2..9`.
- Sus centros longitudinales están en `z = -5.8` y `z = 5.8`.
- Cada banco mide `5.7 m` sobre el eje Z.
- La silla ocupa `x = 6.55..7.65`, `z = -0.65..0.65`.
- Las gradas derechas comienzan en `x = 10.17`.
- Las gradas izquierdas terminan en `x = -9.57`.
- Cada grada deja libre el corredor central `|z| < 1.6`.
- Las cuatro barandas usan las franjas visuales exactas.
- La baranda derecha ocupa `x = 9.925..9.975`.
- La baranda izquierda ocupa `x = -9.375..-9.325`.

Las alturas describen el sólido visual compartido.

- Banco: `1.7 m`.
- Silla: `3 m`.
- Grada: `3.52 m`.
- Baranda: `1.05 m`.

## API

`ARENA_BOUNDS` expone el dominio jugable existente.

`ARENA_OBSTACLES` expone AABB, tipo, identificador y altura.

`arenaObstacleAt(point, padding, y)` consulta un sólido.

`firstArenaObstacleHit(from, to, radius)` barre una esfera tridimensional.

`findArenaPath(from, target, radius)` devuelve puntos, destino y longitud.

`constrainArenaMotion(from, requested, radius)` devuelve movimiento y ejes bloqueados.

El renderer puede importar esta geometría sin duplicar coordenadas.

## Movimiento

La IA usa un grafo de visibilidad sobre esquinas AABB.

Cada AABB se amplía únicamente por el radio del jugador.

Las esquinas reciben `0.035 m` para evitar contacto numérico.

Un destino dentro de un sólido se proyecta al borde accesible más cercano.

Los jugadores rodean bancos, silla, gradas y barandas.

El corredor central permite rodear la silla y llegar detrás del árbitro.

El movimiento manual usa barrido continuo y deslizamiento tangencial.

Esto evita atravesar sólidos entre dos cuadros consecutivos.

La restricción exterior se activa tras cruzar completamente el cerramiento.

Los límites interiores originales permanecen sin cambios.

La vuelta a cancha conserva el paso por la puerta protegida.

## Pelota

La pelota exterior colisiona con muebles, gradas y barandas.

El barrido tridimensional evita atravesar una baranda entre cuadros.

Una pelota sobre el sólido mantiene su trayectoria.

El contacto termina la jugada mediante la regla exterior existente.

Un golpe sin pique sigue siendo error del último golpeador.

Tras un pique, el punto corresponde al último golpeador.

No cambian `PointOutcome`, `finishPoint` ni coeficientes físicos.

## Validación

`game/arena-layout.test.ts` verifica coordenadas, barandas y límites.

También verifica rutas, alturas y barrido contra barandas.

`game/physics.test.ts` verifica recorrido real de IA y movimiento manual.

Verifica profundidad interior y colisión de pelota contra la silla.

La recuperación natural por tres conserva puerta, devolución y segundo bote.

Validación ejecutada:

- `npm test`: 124 pruebas aprobadas.
- TypeScript global pasó tras corregir el tipado del inspector de grabaciones.
- `npx oxlint game/arena-layout.ts game/arena-layout.test.ts game/physics.ts game/physics.test.ts`: sin errores.
