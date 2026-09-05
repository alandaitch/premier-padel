# Física V5 · Puertas, recuperación exterior y remate cargado

El por 3 ahora permanece vivo fuera de la pista. Un defensor puede salir por una puerta, devolver desde afuera y volver a entrar. El movimiento manual utiliza las mismas restricciones de paredes y puertas que la IA. El por 4 conserva el cierre inmediato tras un pique válido.

Las fuerzas, el giro, los materiales y los contactos pasivos de V4 permanecen iguales. No se agrega energía durante el pique o el contacto con vidrio.

## Referencia reglamentaria

[Reglamento FIP, aplicación 01.01.2026](https://www.padelfip.com/wp-content/uploads/2025/12/FIP_Rules-of-Padel-1.pdf), consultado el 5 de septiembre de 2026:

- Accesos y zona segura, páginas 7–8: juego exterior requiere dos accesos por lateral. Cada hueco admite 0,72–1,10 m de ancho y 2,00–2,20 m de alto. Zona libre: al menos 3 m de ancho; recomienda 4 m. Se extiende 4 m a cada lado de la red. Se requieren protecciones acolchadas.
- Regla 13.1e: salida por fondo termina el punto; salida lateral o puerta sigue hasta segundo pique u objeto ajeno.
- Reglas 14.1j y 16: se permite devolver desde afuera con juego exterior autorizado.
- Regla 7.1f: saque que pica correctamente y sale directamente por puerta es falta cuando no hay juego exterior autorizado.

La línea de la zona segura no es una línea de fuera. La simulación limita allí a los jugadores; una pelota que la supera continúa hasta el pique. No se inventa un rebote o una pared invisible en ese límite.

## Geometría compartida

`COURT` exporta los valores que utiliza el renderer:

| Campo                | Metros | Uso                                                   |
| -------------------- | -----: | ----------------------------------------------------- |
| `doorMinZ`           |   0,10 | Borde interior de cada hueco, junto al poste central. |
| `doorMaxZ`           |   1,20 | Borde exterior; ancho libre de 1,10 m.                |
| `doorHeight`         |   2,20 | El travesaño superior mantiene colisión.              |
| `exteriorWidth`      |      4 | Zona exterior desde cada lateral.                     |
| `exteriorHalfLength` |      4 | Extensión longitudinal a ambos lados de la red.       |
| `playerRadius`       |   0,22 | Margen geométrico del cuerpo.                         |

Hay huecos en `z=[0,10;1,20]` y `z=[−1,20;−0,10]`, sobre ambos laterales `x=±5`. Las zonas exteriores ocupan `|x|=5…9`, `z=−4…4`. El radio del jugador reduce el espacio transitable; la pelota conserva su radio de 3,3 cm.

El cuerpo no puede atravesar vidrio, malla, postes, fondo ni campo rival. Puede rodear el poste de la red por afuera. Debe regresar por la puerta de su propio campo. La separación de compañeros también respeta estas restricciones.

## Flujo de pelota y defensa

El estado distingue pelota exterior de pelota interior. Una salida lateral por arriba o por la abertura genera `outside`, sin asignar el punto. La red sólo colisiona entre sus postes; no tiene una prolongación invisible afuera.

El segundo pique exterior adjudica el punto a quien golpeó. Tras una devolución desde afuera, el primer pique debe ocurrir dentro del campo rival. Una devolución contra la cara exterior del cerramiento pierde el punto. La pelota puede reingresar sobre el lateral o por una puerta abierta.

La IA predice la salida con el mismo integrador. Calcula el recorrido pasando por puntos a ambos lados de su puerta. Incluye esa distancia en la evaluación del tiempo disponible. Puede intentar una recuperación difícil, pero no acelera artificialmente ni atraviesa el cerramiento para llegar.

El retorno desde afuera utiliza apuntado asistido: resuelve un lanzamiento inicial que supera el lateral y busca el campo rival. Luego la pelota sigue únicamente la física compartida. Actualmente la IA prefiere esta devolución alta; la variedad de devoluciones bajas por puerta queda pendiente. La colisión y reentrada por puerta ya funcionan.

## Dirección real del por 3

`aim<0` solicita salida por el lateral izquierdo del mundo; `aim>0`, por el derecho. En la cámara principal del equipo humano corresponde a izquierda/derecha de pantalla. El punto del primer pique puede ser distinto del costado final.

El asistente evalúa trayectorias iniciales y descarta salidas por el costado opuesto. Prefiere candidatas que vuelven a una altura alcanzable dentro del espacio exterior disponible, cuando existen. Esto no garantiza que el defensor llegue. La selección ajusta objetivo y giro **antes** del contacto; no corrige vuelo, pique o vidrio después.

El por 3 usa una combinación de giro menos extrema que la selección inicial de V4. La evaluación mantiene el límite de velocidad según potencia. Es una técnica asistida y calibrada para jugabilidad, no una medición individual de jugadores profesionales.

## Contrato de carga

Nuevos campos de `Input`:

```ts
charging?: boolean;
charge?: number;          // 0…1
perfect?: boolean;
timingQuality?: 'perfect' | 'good' | 'late';
```

Mantener la carga prepara el cuerpo y la pala; no golpea. `Player.charging`, `Player.charge` y `preparation` permiten representarlo. Al liberar, `hit` almacena golpe, potencia, dirección, variante y calidad.

El remate con `charge>0.2` conserva su comando durante **0,85 segundos**. Los demás mantienen **0,42 segundos**. Es una asistencia explícita para sincronizar la carga con el globo. Permite empezar a cargar con el feed y liberar cerca del máximo antes de que la pelota alcance la pala.

La calidad de un comando cargado permanece durante su ventana. `contactPoint.quality` se escribe exclusivamente al contacto real. `perfect` requiere un remate todavía válido, pelota descendente, altura suficiente y alcance cercano. Si la pelota obliga a convertirlo a plano, recibe calidad `good`, sin falso premio de remate perfecto.

La calidad perfecta puede elevar hasta 0,07 la potencia inicial, con techo 1. La calidad tardía aplica un factor 0,88. La UI puede enviar directamente potencia 1 en su ventana perfecta. Ninguna calidad cambia la restitución ni agrega un impulso posterior.

## Pruebas y reproducción

**45 pruebas de física pasan**, junto con TypeScript y oxlint de `game/physics.ts` y `game/physics.test.ts`. Se mantienen las regresiones de V4, incluida energía pasiva, caída, giro, paredes, servicios, puntuación y partido completo.

Las nuevas pruebas cubren:

- Salida y reingreso del cuerpo por puerta, paredes y campo rival bloqueados.
- Pelota por abertura y colisión por encima del travesaño.
- Plano de la red limitado a sus postes.
- Saque por puerta con y sin autorización exterior.
- Devolución exterior que reingresa y pica correctamente.
- Primer pique exterior inválido y segundo pique exterior ganador.
- Carga sin golpe, calidad sólo al contacto y conversión sin falso perfecto.
- Comando liberado conservado durante más de 0,75 s, dentro de la ventana ampliada.
- Recuperación natural por ambos costados, incluyendo puerta, golpe afuera y regreso del defensor.

Reproducción natural: entrenamiento `drill:'remate'`, dificultad difícil y los perfiles Tapia/Coello/Galán/Chingotto. Se deja ejecutar el feed del ejercicio. Se pulsa una vez al entrar en alcance, con potencia 1, variante `por3`, calidad perfecta y dirección indicada. No se recoloca pelota ni jugador durante el rally.

| Evento                        |   Dirección +0,9 |     Dirección −0,9 |
| ----------------------------- | ---------------: | -----------------: |
| Feed rival                    |          1,208 s |            1,208 s |
| Contacto de Tapia             |          2,792 s |            2,792 s |
| Salida lateral                | 4,833 s, derecha | 3,958 s, izquierda |
| Golpe rival afuera            |          5,567 s |            4,900 s |
| Pelota reingresa; rally sigue |          5,817 s |            5,392 s |

La regresión comprueba también que los pies cruzaron la puerta propia y que el defensor volvió al interior. Un ensayo separado libera el comando antes de llegar la pelota y comprueba que conserva remate, dirección y calidad hasta el contacto.

## Límites pendientes

El apuntado inicial y la devolución exterior son asistidos. No se simulan todas las interacciones entre cuerpo, pala, red y estructura. Las condiciones reglamentarias se representan mediante geometría y estado; no hay un juez de interferencias completo.

La IA utiliza rutas por puntos de paso y una predicción determinista. Puede tener dificultades si otro jugador tapa una puerta. La zona exterior transitable es rectangular y limitada; no modela todas las disposiciones de estadio. La física de materiales sigue teniendo las aproximaciones documentadas en `PHYSICS-V4.md`.
