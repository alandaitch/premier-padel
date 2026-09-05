# Auditoría del input de joystick V6

Revisión de código y fixtures puros. No hubo joystick físico conectado ni inyección de dispositivos en el navegador.

## Correcciones requeridas detectadas

1. **Orden de liberación y pulsación en el mismo cuadro.** El polling recorría cada acción y emitía su `press`/`release` antes de pasar a la siguiente. Como `base` se recorría antes que `control`, B→A rápido podía clasificarse como simultáneo cuando B se soltaba y A aparecía en un mismo cuadro. El adaptador debe emitir todas las liberaciones antes de todas las pulsaciones nuevas. `ShotCombos` ya resuelve correctamente la secuencia cuando recibe ese orden.

2. **Reemplazo del mando activo.** Si el primer mando desaparece y otro sigue conectado, cambia el índice sin pasar por la rama «sin mandos». Hay que cancelar carga/combos, limpiar entradas y pausar también al reemplazar el dispositivo. El identificador de una carga debe contener índice y botón (`pad:índice:botón`) para impedir una liberación procedente de otro mando.

3. **Remapeo de una acción sin botón.** Al asignar `aimLeft` al botón A de base, la función eliminaba la entrada de base. La hidratación volvía a poner el default A y generaba dos acciones en el mismo botón. Solución: un valor explícito `-1` para «sin asignar», preservado por JSON y normalización. `padLabel(-1)` debe mostrar «Sin asignar».

4. **Gamepad API bloqueada.** `navigator.getGamepads()` puede lanzar `SecurityError` si una Permissions Policy lo impide. La consulta no debe detener el RAF; capturar la excepción y degradar a teclado.

5. **Pausa reasignada.** El filtro de diálogos descartaba la tecla personalizada de pausa al intentar continuar. Escape funcionaba por el propio diálogo, pero una tecla reasignada no. Resolver pausa antes de filtrar el diálogo cuando no está abierta la configuración; detener la propagación de la tecla consumida.

## Ajustes menores

- El movimiento analógico debe activar también los rótulos de joystick; originalmente sólo lo hacía un botón.
- Al desconectar, no mantener el HUD simple por `activeDevice === 'gamepad'` si ya no queda dispositivo conectado.
- Configuración debe describir el esquema de teclado guardado, independientemente del último dispositivo utilizado.

## Fixtures

`game/gamepad-controls.test.ts` agrega cinco casos:

- Liberación y pulsación opuesta en el mismo timestamp conservan el orden del combo.
- Dos botones sostenidos disparan una sola combinación, sin repeticiones.
- Remapear una acción inicialmente sin botón conserva el conflicto desasignado al serializar.
- Varios remapeos y recarga mantienen botones activos únicos.
- `-1` permanece desasignado; valores inválidos vuelven al predeterminado.

Antes de corregir el sentinel: **3 aprobados y 2 fallidos**, ambos por el remapeo persistente. Corregido el sentinel en `control-mapping.ts`: **5/5 aprobados**; junto con los ocho casos iniciales, **13/13 aprobados**. La validación de los fixes del polling y pausa corresponde a la integración de la app. Estos fixtures no acreditan validación de hardware.

## Comportamientos revisados sin defecto concreto

- Mantener el botón de remate sólo inicia una carga; soltar su fuente termina esa carga.
- Entrar en pausa, perder foco o cambiar mapping cancela el golpe retenido.
- Los diálogos no avanzan el partido. El polling conserva el estado físico de botones para evitar pulsaciones repetidas al cerrar ajustes.
- El stick izquierdo y la cruceta mueven; el derecho apunta; se aplica deadzone continua.
- Los botones reasignados usan el mismo despachador de acciones que teclado.

## Integración corregida

El integrador aplicó las cinco correcciones y ambos ajustes de HUD en V6. TypeScript y fixtures aprobados. La prueba de pausa reasignada se verifica también en navegador; el hardware físico continúa pendiente.

## Cierre de revisión de escenas

Revisé nuevamente el código integrado. La transición hacia una escena limpia combos pendientes, teclas, carga, dirección táctil y golpe retenido antes de detener el motor. Esto corrige el caso de una pulsación previa al punto que podía ejecutarse como saque al terminar la celebración. Pausa conserva el reloj de la escena; el dispatcher permite omitir con golpe base o acción directa. La continuación termina en el siguiente punto sin liberar una carga vieja.

Los cinco defectos de polling/remapeo/pausa descritos arriba están corregidos en el código revisado. No encontré otro bloqueo concreto de carga, remapeo o continuidad en esta última lectura. La compatibilidad con un mando físico sigue sin comprobarse en esta sesión.
