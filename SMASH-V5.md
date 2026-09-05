# Remate cargado V5

Mantené L, apuntá con A/D o las flechas laterales y soltá en verde. W/S siguen moviendo adelante y atrás. Q/E también permiten apuntar durante la carga. El joystick táctil dirige el remate mientras se mantiene el botón CARGAR. Los demás golpes conservan ejecución directa y Shift para potencia.

La barra tarda 1050 ms en subir. El centro perfecto está al 82 %, equivalente a 861 ms. No vuelve a pasar automáticamente por verde si se mantiene la tecla: la sobrecarga pierde potencia. El contacto perfecto requiere además altura, descenso y alcance válidos en el motor; acertar la barra sin llegar a la pelota no muestra un premio falso.

| Ventana               | Ancho de barra | Margen temporal total |
| --------------------- | -------------: | --------------------: |
| Fácil, predeterminado |           28 % |                294 ms |
| Normal                |           16 % |                168 ms |
| Exigente              |            7 % |               73,5 ms |

Se configura desde Configurar partido o Pausa → Ajustar remate. La preferencia se conserva localmente. La dificultad del rival es independiente del margen de la barra.

El motor guarda el remate liberado durante 0,85 s para esperar el contacto. La potencia y dirección quedan fijadas al soltar, aunque cambien las teclas después. Esta asistencia y sus límites están documentados en `PHYSICS-V5.md`.

El contacto perfecto dispara un pulso visual localizado, estela y una pequeña reacción de cámara; la UI muestra ¡PERFECTO! durante un segundo. Un golpe sonoro breve combina transitorio, cuerpo grave y una cola aguda. Estos efectos no alteran el vuelo ni los rebotes. El cartel respeta la preferencia de movimiento reducido.

El botón de carga puede operarse con puntero mantenido; por teclado accesible, Enter alterna inicio y liberación. Perder foco, pausar, cambiar jugador, elegir otro golpe o terminar el punto cancela una carga pendiente.

`game/smash-charge.test.ts` verifica centro, bordes y anchura de las tres ventanas; un toque breve, una carga demasiado larga y la caída de potencia. Las regresiones del motor verifican contacto, calidad, retención del comando y recuperación exterior natural.

La cámara y poses de `work/v5-demo` son herramientas locales de revisión. Sus entradas están programadas y rotuladas como demo del motor. No se presentan como un partido humano. El juego publicado utiliza los controles del usuario.

## Validación de integración

La versión integrada pasó 47 pruebas, TypeScript y compilación de producción.
En navegador se comprobó entrenamiento de remate, inicio y liberación de carga
mediante el botón accesible, contacto real con confirmación de perfecto, cambio
de ventana desde pausa y regreso al mismo partido. El control L llama a las mismas
funciones de inicio/liberación mediante keydown/keyup.

La auditoría independiente distingue las pruebas de interfaz de la demostración
con entradas programadas. Las limitaciones de automatizar una tecla sostenida
y del parecido visual se detallan en `PADEL-REVIEW-V5.md`.
