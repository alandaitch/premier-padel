# V7 — Festejo secreto de Lebrón

## Activación

Después de ganar el partido la pareja de Lebrón, ingresar **S → S → W → D → J → K**.
La ventana dura ocho segundos. La secuencia tiene un límite de 3,2 segundos y cada
intervalo entre pulsaciones debe ser de 0,9 segundos o menos. Hay que soltar cada tecla.

Se reconocen acciones lógicas: abajo, abajo, arriba, derecha, base, control.
El esquema clásico utiliza la acción globo como último token porque no expone control.
Las etiquetas muestran el mapping actual. En mando estándar: cruceta ↓ ↓ ↑ →, A, B;
los dos botones finales respetan el mapping. El stick no ingresa direcciones del código.

Sólo habilita una victoria de partido de una pareja que incluya el perfil `lebron`.
Funciona en cualquiera de los cuatro lugares, incluyendo la pareja rival.
Un punto, juego, set intermedio, derrota o formación sin Lebrón no habilitan el código.
No acumula teclas antes de la victoria. Un error reinicia la secuencia y la repetición
automática de teclas no avanza. Pausar, perder foco, cambiar configuración,
desconectar el mando o saltar la escena borra el progreso.

## Presentación

El festejo se reproduce una sola vez durante 8,8 segundos. La simulación permanece
congelada y el resultado no cambia. Continuar lo puede saltar. Al volver al partido,
menú o nueva formación, se restauran camiseta y pala.

Referencia observada por dos agentes: [video aportado por Alan](https://youtube.com/shorts/bRjpnMPQMEM).
El gesto principal es el torso descubierto y la camiseta sostenida extendida hacia los
rivales, seguida de su elevación. La retirada completa no aparece continuamente;
esa transición se reconstruye con animación procedural. No se descarga ni incorpora
el video o su audio. La señal sonora se sintetiza localmente y respeta volumen/silencio.

## Validación

- Ocho pruebas del reconocedor: orden, errores, límites de tiempo, reinicio,
  pulsación única, acciones remapeadas y expiración sin entrada adicional.
- Cuatro pruebas nuevas del director: Lebrón en los cuatro lugares, elegibilidad,
  vencimiento, pausa, activación única, salto y marcador inalterado.
- Auditoría de la integración: teclado y mando comparten el mismo reconocedor;
  los eventos se filtran por pulsación nueva antes de entrar en él.
- Revisión visual y sus límites en `PADEL-REVIEW-V7.md`.
- App real local: partido corto completo Tapia/Coello contra Lebrón/Augsburger;
  victoria rival 0–3, entrada de teclado mediante CUA `s,s,w,d,j,k`,
  cartel «EL LOBO · FESTEJO ESPECIAL», transición automática al resultado 0–3
  y revancha 0–0 con camiseta y pala restauradas. No se inyectó el resultado.
- Suite completa: 83/83 pruebas aprobadas; TypeScript, lint dirigido y build de producción aprobados.
- No hubo un joystick físico conectado: su adaptador y mapping se validan con pruebas.
