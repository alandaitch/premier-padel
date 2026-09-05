# V10: víbora y guitarra de Paquito

## Referencias realmente observadas

Se descargaron los dos Shorts públicos pedidos por Alan mediante `yt-dlp`, sin usar cookies. Se conservaron MP4 y streams de origen separados en `work/v10-references/`. Los medios son referencias locales de análisis; no se incorporan sus píxeles ni su audio al juego.

- [Víbora de the4Set](https://www.youtube.com/shorts/wzJP9SfqjEQ): 10.981 segundos, tres vistas editadas del mismo tipo de técnica. Se revisaron una hoja a 1 fps, dos secuencias a 6/8 fps y cuadros individuales a 1.50, 1.80, 2.12 y 2.38 segundos.
- [Paquito Navarro](https://www.youtube.com/shorts/3zVCJP2-jCI): 24.301 segundos, montaje de distintos puntos y festejos. Se revisaron una hoja a 1 fps, dos secuencias a 6 fps y cuadros individuales a 7.10 y 7.45 segundos.

Los timecodes son del archivo editado, no del reloj de partido. La cámara lenta no permite deducir la velocidad real del brazo. Las medidas del rig son una interpretación visual, no captura de movimiento.

## Víbora: qué cambia

| Cuadro observado | Detalle visible | Aplicación al rig |
| --- | --- | --- |
| 1.50 s | Perfil, rodillas flexionadas, mano izquierda arriba, codo derecho lateral; pala junto a la cabeza | Separar hombros y cadera, codo alto pero sin llevarlo encima de la coronilla |
| 1.80 s | La mano libre abre y empieza a bajar; el tronco comienza a girar | Anticipar el descenso del brazo libre antes del impacto |
| 2.12 s | Muñeca retrasada y pala casi transversal detrás del cuello | Acostar brevemente la pala hacia la nuca; evitar la caída vertical profunda de remate |
| 2.38 s | Brazo acelera por el costado mientras se abre el pecho | Anclar la cara al contacto físico, no agregar un contacto visual ficticio |
| Secuencias lateral y frontal | Cruza hacia el hombro opuesto; después baja y recupera con paso/pivote | Terminación primero alta y después baja; talón posterior acompaña el giro |

`game/shot-motion-v10.ts` exporta dos funciones puras:

- `viboraPreparation(preparation, handedness, anticipation)`: el tercer argumento representa la última fracción de segundo **previa** al contacto. En cero mantiene la carga; en uno abre el brazo libre y produce el retardo transversal de la pala. Devuelve codo y muñeca de ambos brazos en coordenadas `rig.upper`.
- `viboraFollowThrough(ageSeconds, handedness)`: devuelve giro, brazo libre y centro final de pala en coordenadas `rig.root`. `finishBlend` vale exactamente cero en el instante de contacto. La pelota y sus efectos siguen perteneciendo a `PadelMatch`.

Las coordenadas X y los giros se espejan para zurdos. Los ejes de pala deben normalizarse antes de construir una base ortonormal.

### Integración realizada en renderer.ts

La integración sigue estos puntos, conservando las ramas de bandeja/remate:

1. En `prepareOverhead`, para `shot === 'vibora'`, usar `viboraPreparation`; sus landmarks alimentan `poseArm`. Utilizar su `racketUp` para la orientación de pala ya existente. Para evitar un descenso instantáneo del brazo libre, pasar `anticipation` calculado con la llegada descendente de la pelota a la ventana de contacto durante aproximadamente 0.10–0.14 s. No usar un temporizador posterior al golpe.
2. En la rama de giro corporal `hasContact && overhead`, sobrescribir únicamente víbora con `viboraFollowThrough(age, rig.hand)`.
3. En el bloque de brazo libre `hasContact && ['bandeja', 'vibora'].includes(contactShot)`, usar sus `freeElbow/freeWrist` para víbora.
4. Dentro del bloque de `armTarget`, mantener el contacto real inicial y sustituir solamente el final de víbora por `root.localToWorld(new Vector3(...pose.finishRoot))`, usando `pose.finishBlend`. Dar `faceDirection.y = pose.faceLift` a `anchorRacket`.
5. El giro de muñeca `pose.pronation` se aplica **después** de `anchorRacket`. El apoyo posterior puede usar `rearHeelLift`; no desplazar la posición física del jugador para simular un paso.

Ejemplo para el final, dentro de la rama existente:

```ts
const motion = viboraFollowThrough(age, rig.hand);
rig.root.updateMatrixWorld(true);
const finish = rig.root.localToWorld(new THREE.Vector3(...motion.finishRoot));
this.armTarget.lerp(finish, motion.finishBlend);
// Conservar el posterior anchorRacket y la degradación de su peso a los 0.58 s.
```

## Paquito: guitarra, con rodilla derecha al piso

El montaje muestra más de una variante. La elegida es especialmente legible entre 6.7 y 7.9 s: Paquito adelanta y apoya el pie izquierdo, baja la rodilla derecha, extiende el antebrazo izquierdo como un mástil imaginario, mantiene la pala **en la mano derecha**, cerca de la cadera, y hace movimientos de rasgueo. El pecho permanece alto y la boca está abierta. En otra variante del montaje hace el mismo gesto de pie.

`game/paquito-celebration.ts` exporta `paquitoGuitarPose(progress)` y `PAQUITO_GUITAR_SECONDS = 3.6`.

- La entrada y la salida son continuas. La entrada baja la pelvis; la salida recupera la altura normal antes de caminar.
- `leftAnkleRoot/rightAnkleRoot` son objetivos de pies para `solveLeg`, después de aplicar `bodyHeight` y actualizar matrices. La izquierda queda adelante; la derecha atrás del muslo descendido.
- Codos y muñecas alimentan `poseArm` en `rig.upper`.
- `racketUp/racketNormal` son una orientación deseada en `rig.upper`, **no** Euler relativos al codo. Para que la pala permanezca cerca del muslo, construir la base y multiplicar por la inversa de `dominantArm.quaternion * dominantElbow.quaternion`, como ya hace `prepareOverhead`.
- `mouthOpen` sirve para abrir un rasgo de boca si el rig lo expone. No agrandar la cabeza completa para representar el gesto.
- No trasladar ni soltar la pala. La mano izquierda hace un mástil imaginario.

### Condición de activación

El director debe elegir esta celebración sólo si el último golpe que resolvió el punto fue un `remate` del jugador cuyo perfil es `navarro` y su equipo ganó ese punto. No alcanza con que Paquito forme parte de la pareja ganadora: no debe activarse al rematar el compañero, al fallar un rival después de varios golpes posteriores ni al perder Paquito su propio remate. El gesto es una presentación de punto y no necesita el combo de victoria de Lebrón.

La duración debe extenderse a 3.6 s cuando se activa; no comprimir el arrodillado y tres rasgueos en los 1.35 s de un punto normal. Al saltar la presentación, restaurar la pose antes de volver al saque.

## Límites de esta entrega

Los helpers fueron comprobados para valores finitos, espejado zurdo y contacto sin desplazamiento visual inicial. La revisión en navegador del renderer integrado confirmó la guitarra a 4.8 s y el armado/contacto de víbora a 2.867/2.883/2.900 s. Paquito gira hacia la grada del fondo: la cámara queda en su mismo campo y la red ya no tapa la rodilla. Su boca se abre mediante un rasgo separado, sin deformar la cabeza completa.

La primera trayectoria de entrenamiento golpeaba 0.53 m detrás del jugador y forzaba una extensión excesiva. Se preparó otra trayectoria mediante **Input real**, sin modificar estados ni posiciones: mantener S (`moveZ=1`) desde 1.2 hasta 2.0 segundos; luego quieto y golpear cuando `canHit` con pelota descendente. Contacta a 2.883 s, 0.199 m delante y 0.199 m hacia la derecha. Los 361 cuadros se conservan en `work/v10-motion-inspector/vibora-input-real.json`. La inspección confirmó una posición de brazo menos forzada y coincidencia entre pala y pelota.

Las piernas aún usan el salto/tijera procedural compartido con golpes altos. Una mejora pendiente es dar a la víbora más pivote apoyado y menos suspensión, como en el Short. La recuperación sigue procedimental y las caras mantienen el estilo del prototipo. No se declara paridad con Virtua Tennis ni reproducción anatómica exacta.

TypeScript y lint de renderer/helpers pasaron. Las once pruebas de presentación pasaron, incluidas tres nuevas: activación de Paquito en cualquier posición de la pareja, exclusión de remate del compañero/otro golpe/punto perdido y limpieza al saltar la escena. No se alteró el marcador durante la celebración.
