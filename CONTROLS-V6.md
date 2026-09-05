# Controles V6

## Diseño

El esquema simple es el predeterminado. Agrupa golpes por armado y deja sólo tres familias grandes en el HUD:

| Entrada predeterminada | Acción                                                   |
| ---------------------- | -------------------------------------------------------- |
| WASD                   | Movimiento; durante carga A/D dirigen el remate          |
| J                      | Plano, volea o bajada según altura, pique y posición     |
| K                      | Bandeja ante pelota alta; control corto ante pelota baja |
| J → K                  | Globo                                                    |
| K → J                  | Dejada cerca de la red; chiquita desde el fondo          |
| J + K                  | Víbora alta o volea baja                                 |
| Mantener L y soltar    | Carga del remate y evaluación de perfecto                |
| Espacio                | Saque o golpe base inmediato, sin espera de combo        |
| Q / E                  | Dirección del tiro; stick derecho en joystick            |
| R                      | Traérmela, por tres, paralelo alto, por cuatro           |
| F                      | Retorno exterior automático, puerta, por arriba o red    |
| B / Tab / Esc          | Esperar pared / cambiar jugador / pausa                  |

La pulsación simultánea exige ambas familias sostenidas con una separación máxima de 70 ms. Una secuencia admite hasta 220 ms; soltar el primero antes del segundo distingue la secuencia incluso si fue rápida. La primera familia espera esa ventana antes de emitir un golpe simple: no hay un golpe anticipado seguido por otro de combo. Espacio ofrece contacto inmediato.

`ShotCombos` es puro y recibe `press`, `release`, `flush` y `reset`. Teclado y joystick pasan por `pressAction` y terminan en el mismo `fireStroke`. Pausar, salir de la ventana, cambiar de esquema o desconectar el joystick descarta combinaciones pendientes y carga.

## Personalización

Configuración está disponible desde el menú y durante la pausa. «Personalizar teclas y botones» permite cambiar una asignación presionando la nueva entrada. Un conflicto intercambia ambas asignaciones y muestra cuáles cambió. Escape permanece reservado para pausa; entradas incompatibles se rechazan con mensaje. Restaurar devuelve los controles originales. Se guarda en las preferencias existentes del navegador.

El esquema clásico conserva una tecla por golpe. Al cambiar entre esquemas se resuelven las teclas activas duplicadas sin perder la acción prioritaria. Los rótulos del HUD usan el mapping real.

## Joystick

Se consulta `navigator.getGamepads()` en cada cuadro. Cualquier mando expuesto por el navegador puede usar sus botones; se avisa cuando no posee mapping estándar. Joystick conserva las tres familias aunque el teclado esté en modo clásico.

- Stick izquierdo mueve; cruceta también. Stick derecho apunta.
- A/✕ = base; B/○ = control; X/□ = carga; Y/△ = golpe inmediato/saque.
- LB/L1 espera pared; RB/R1 cambia jugador; LT/L2 cambia remate; RT/R2 cambia devolución exterior.
- START pausa/continúa. A o Y inicia partido desde el menú.
- Zona muerta ajustable del 5 al 40%, con reescalado continuo fuera de ella.
- Vibración opcional al contacto perfecto, sólo si el navegador/dispositivo ofrece `playEffect`.
- El panel muestra nombre del dispositivo y botones realmente pulsados. Al desconectarlo se pausa y se borran entradas retenidas.

No se comprobó con hardware físico conectado en esta sesión. No se afirma compatibilidad física certificada por marca. La reasignación permite adaptarlo; los ejes de movimiento/apuntado mantienen índices estándar. Los menús detallados siguen usando teclado/mouse/táctil.

## Evidencia

- Ocho pruebas puras aprobadas: espera de simple, simultáneo bilateral, orden de secuencia, teclas repetidas y tardías, reset, intercambio de conflictos, sanitización/deadzone y cambio de esquema sin duplicados.
- Cinco fixtures adicionales del joystick aprobados tras corregir la persistencia de acciones desasignadas: `-1` conserva «Sin asignar» después de JSON. Total de controles: **13/13**.
- `tsc --noEmit`: aprobado tras integración UI.
- `oxlint game/control-mapping.ts game/control-mapping.test.ts game/controls.ts`: aprobado.
- Navegador real localhost5173: cambié J por K; confirmó intercambio con control. Recargué y persistió. Restauré controles originales.
- Partido rápido: Espacio sacó; J+K seleccionó volea; J→K seleccionó globo; K→J seleccionó toque corto. Verificado por los consejos visibles del golpe seleccionado. El tipo de «último golpe» muestra a cualquier jugador, por eso no se usó como evidencia del input propio.
- Escape abre pausa una sola vez; ajustes de controles disponibles durante pausa.
- Captura visual a 1280×720: tres familias, combos compactos, controles por debajo de la pista. El panel de asignaciones se despliega dentro de un diálogo desplazable.

## Referencias primarias

Se tomó la idea de agrupar golpes y distinguir pulsaciones simultáneas/secuenciales, sin copiar el esquema ni física del tenis:

- [Nintendo: manual Mario Tennis Ultra Smash](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/wii_u_6/mario_tennis__ultra_smash/ElectronicManual_WiiU_MarioTennisUltraSmash_EN.pdf): secuencias A→B para globo y B→A para dejada.
- [Nintendo: actualizaciones Mario Tennis Aces](https://en-americas-support.nintendo.com/app/answers/detail/a_id/29137): combinaciones simultáneas para variantes de golpe.
- [MDN: Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API): polling, botones, ejes y eventos del navegador.
- [MDN: vibrationActuator](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/vibrationActuator): soporte opcional de vibración.

## Integración de escenas

El coordinador de presentación puede bloquear `pressAction`/`fireStroke`, llamar `combos.current.reset()` y `cancelCharge()` al comenzar una escena, y usar la acción `quick` para omitirla. El ciclo de input está antes del `m.update()` fijo; la escena debe impedir que ese ciclo avance el partido mientras esté activa. Los controles guardados viven en `settingsRef.current`.
