# Renderer V6 — técnica, cambios de lado y bancos

Implementación en `game/renderer.ts`. El renderer consume `PresentationState` del director de partido; no decide puntos, descansos, marcador ni resultados. Las escenas de conversación son interpretaciones ficticias. Los entrenadores son personajes genéricos.

## Resultado implementado

- `setPresentation(PresentationState | null)`: celebración, recorrido, banco y regreso. La fase y su progreso pertenecen al director. Omitir o terminar una escena recupera la cámara jugable inmediatamente.
- Ganadores reaccionan con el brazo libre y miran a su pareja cuando están próximos. Rivales bajan la cabeza o gesticulan según `frustration`. La intensidad del personaje de Lebrón toma `lebronIntensity`; no reproduce declaraciones ni una voz real.
- Bancos a z±13,6 m, con toallas, mesa, botellas, bolsos y dos entrenadores articulados. El entrenador se coloca a un costado para dejar visibles ambos jugadores.
- Cada recorrido sale por una puerta real, bordea el cerramiento y llega al banco. Los equipos usan carriles separados por 0,88 m para cruzarse por el mismo lateral. En el regreso vuelven a entrar por las puertas. No se anima un cruce a través del vidrio o la red.
- El asiento se adapta a la estatura. Rodillas y tobillos se resuelven hacia el piso; pelvis y banco comparten una altura coherente. Escuchar, explicar y responder usan brazos, cabeza y torso.
- `endsSwapped` transforma jugadores, pelota, sombras, efectos y cámara 180° respecto del estadio fijo. El motor continúa en sus coordenadas de control. La IK se calcula antes de esa transformación. El cristal del extremo próximo a la cámara se atenúa en ambos lados.
- La cámara de celebración calcula distancia según separación de la pareja y aspecto del canvas. La cámara del banco encuadra la conversación. Al reanudar se recupera el encuadre completo sin un recorrido de cámara por el piso.
- Exterior ampliado desde `COURT`: superficies de 8×14 m en cada lateral. Tribunas, árbitro, cámaras y cartelería quedan fuera. La cámara sigue recuperaciones hasta el nuevo límite físico.

## Cambios técnicos y humanos

`Player.preparedShot` permite preparar el golpe elegido, sin confundirlo con el anterior. Bandeja y víbora conservan armado lateral temprano, con diferente flexión y orientación de la pala. La bandeja presenta una cara más abierta y eje de pala lateral; termina sobre el hombro opuesto. La víbora usa una cara más vertical y un barrido cruzado más rápido y bajo. La mano libre abre y desciende para equilibrar el giro. El tronco realiza un contrapeso acotado cuando la pelota llega sobre el eje corporal; la pelota y el contacto siguen siendo los del motor.

El apoyo posterior avanza en la recuperación de esos golpes. La volea de revés conserva una terminación corta delante del cuerpo. El remate mantiene la carga, extensión, pronación y caída de V5. El renderer no agrega potencia, spin ni cambios de trayectoria.

Ojos más pequeños y retraídos; menor proyección nasal y contraste de labios; bigote fino sobre la superficie. Hombros y mangas se estrechan y redondean dentro de la camiseta. Se conservan las indumentarias y los sponsors de los perfiles documentados en `PLAYERS-V4.md`.

## Investigación utilizada

- **Observado directamente en esta iteración:** [Paquito Navarro, DaleCandela TV — La bandeja](https://www.youtube.com/watch?v=5c52jcX5HQU), demostración alrededor de 2:06–2:16. La imagen de 2:11 muestra brazo lateral, mano libre abierta y cara de pala abierta; es una explicación lenta del jugador, no un punto competitivo.
- **Leído directamente:** [LTA — bandeja y remate](https://www.ltapadel.org.uk/play/padel-tips-and-techniques/overheads-bandeja-and-the-smash/). Preparación lateral, contacto aproximadamente a la altura de los ojos, recorrido descendente y cruzado, recuperación hacia la red.
- **Leído directamente:** [The Padel School — volea de derecha](https://thepadelschool.com/padel-tips/how-accurate-is-your-forehand-volley-technique). Base estable, armado compacto y terminación corta con cara algo abierta.
- **Observado por el auditor en V6:** [The Padel School — bandeja](https://www.youtube.com/watch?v=DVQL4hUMnjw), 1:08–1:33, y [víbora](https://www.youtube.com/watch?v=PihyQF3EnHk), 0:47–1:42. Preparación de perfil, contacto lateral/delante y traslado del apoyo.
- **Observado por el auditor en V6:** [Saska Huttunen / The Padel School — remate liftado](https://www.youtube.com/watch?v=9gQAQ-1H-sE), 3:13–3:15, y [Premier Padel — recuperación exterior de Jensen](https://www.youtube.com/watch?v=Ota8oMac5Fc), 0:10 y repetición de 0:15. Sirven como contraste de técnica y desplazamiento; no se afirma copiar sus movimientos cuadro a cuadro.

## Verificación

- TypeScript y lint del renderer: aprobados.
- Comprobación geométrica temporal: seis contactos con derecha, revés, zurdo, remate y defensa baja. Error de centro de pala a objetivo redondeado a cinco decimales: 0 m en los seis casos.
- Comprobación geométrica temporal de asiento: estaturas de 1,70 / 1,79 / 1,90 m; posiciones de tobillo finitas y pies resueltos al suelo.
- Cuatro recorridos de cambio de extremo revisados numéricamente: los cruces de x±5 ocurren dentro de la puerta y los cruces de z±10 quedan fuera del vidrio de fondo.
- Conservada la escala física de pelota: radio 3,3 cm. Las seis verificaciones de ayuda de legibilidad siguen pasando; en vista cercana no se agranda.
- Inspector del auditor en `work/v6-review/`: escenas preparadas claramente rotuladas y clips guardados del motor. Evidencia en `outputs/visual-audit-v6/`; esas escenas validan presentación, no los disparadores del reglamento. La prueba integral del director y los controles pertenece al trabajo de integración de root.

## Límites y próximo orden

1. El humano sigue siendo procedural y estilizado. No alcanza la continuidad de piel, ropa y cabello de los primeros planos de Virtua Tennis 4. El siguiente salto requiere una malla humana continua, texturas anatómicas y deformación de prendas.
2. Los gestos técnicos son aproximaciones articuladas a referencias, no captura de movimiento. Falta mejorar la transición continua entre frenada, contacto lateral y siguiente paso en las llegadas difíciles.
3. Los recorridos de descanso se resumen en fases salteables. La conversación tiene gestos y dirección corporal, pero no sincronización labial ni animación facial compleja.
4. Público, bolsos y mobiliario continúan simplificados. No bloquean el avance de la versión jugable.
