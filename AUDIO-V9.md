# Audio de reja V9

## Resultado

La reja tiene un sonido metálico propio, sintetizado con Web Audio.

El sonido combina un chasquido, vibración irregular y tres resonancias inarmónicas.

La cola dura como máximo 320 milisegundos.

Los niveles quedan acotados antes del control maestro existente.

## Contrato del impacto

Cada estado actual expone `meshImpactId` y `meshImpact`.

Las capturas V7 y V8 pueden omitir ambos campos.

`meshImpact` contiene estos datos:

| Campo         | Unidad   | Uso                                     |
| ------------- | -------- | --------------------------------------- |
| `id`          | entero   | Deduplicación del impacto               |
| `type`        | `mesh`   | Selección del sonido                    |
| `x`, `y`, `z` | metros   | Posición física                         |
| `time`        | segundos | Sincronización                          |
| `normalSpeed` | m/s      | Velocidad entrante contra la superficie |
| `power`       | 0,12–1   | Intensidad sonora normalizada           |

La potencia usa `clamp(normalSpeed / 18, 0.12, 1)`.

El paneo usa `x`, limitado al rango estéreo existente.

## Ruta física y sonora

La física registra la reja antes de reemplazar el evento principal.

Esto cubre rebotes vivos, faltas directas y saques contra la malla.

También cubre devoluciones exteriores contra el sector metálico.

El punto, juego o falta conserva su evento normal.

La interfaz escucha `meshImpactId` mediante un canal independiente.

Por eso, `eventType='point'` nunca oculta el golpe metálico.

El evento normal omite `mesh` para evitar reproducción duplicada.

El contador se reinicia correctamente al reemplazar `PadelMatch`.

## Muestras reproducibles

`work/v9-recordings/reja-samples.json` contiene tres trayectorias del motor actual.

El generador está en `work/v9-recordings/prepare-reja-samples.ts`.

| Clip                  | Impacto | Potencia | Resultado      |
| --------------------- | ------: | -------: | -------------- |
| `malla-viva`          | 3,033 s |    0,536 | Sigue el rally |
| `falta-directa-malla` | 0,417 s |    0,465 | Punto rival    |
| `saque-a-malla`       | 0,183 s |    0,484 | Segundo saque  |

Cada clip dura más de tres segundos.

Cada muestra conserva suficiente cola posterior para grabar el sonido completo.

El remate alto impacta en el cuadro 182, usando 60 FPS.

## Validación

`npm test` pasó sus 109 pruebas.

La prueba nueva recorre `PadelMatch.collisions` en cuatro desenlaces.

Verifica rebote vivo, punto directo, falta de saque y cerramiento exterior.

`oxfmt` validó los cuatro archivos principales modificados.

La síntesis requiere un `AudioContext` activo por interacción del usuario.

La evaluación tímbrica final requiere escuchar una captura del navegador.

No se cambiaron restitución, fricción, reglas, táctica ni renderizado.
