# Exhibición y descansos · V8

El director de presentación ahora funciona también en el menú. La simulación queda pausada durante celebraciones, caminata, descanso y retorno; al terminar, el mismo marcador continúa. Los cambios sin descanso (primer juego y tiebreak) mantienen su secuencia breve.

Cada descanso ordinario o fin de set contiene ocho segundos de caminata, diez segundos sentados y ocho segundos de retorno. El renderer muestra ambos banquillos durante el recorrido y acerca la cámara durante la conversación. Entrenador sentado en juego; de pie frente a jugadores durante el descanso.

`createDemoMatch` adelanta un partido automático hasta su primer descanso ordinario. No edita resultados ni coloca un marcador ficticio. Usa un máximo de 90.000 pasos a 60 Hz; con la pareja predeterminada alcanza el cambio después del tercer juego. El partido visible continúa con el ciclo de simulación habitual 120 Hz. El costo local medido de preparación está en el orden de 1,5–2,5 s; puede aumentar en dispositivos lentos.

`game/demo-match.test.ts` verifica avance real, llegada al banco, 600 cuadros de descanso a 60 Hz, marcador intacto y retorno al saque. Las pruebas previas del director preservan resultado, cambio de lado y festejo secreto de Lebrón.

El entrenamiento exporta un catálogo de 18 ejercicios. El selector reinicia la alimentación, preselecciona golpe/variante/espera de vidrio, y muestra instrucciones. Espacio usa el golpe objetivo; los combos conservan su selección contextual y L conserva la carga. No se modifica el marcador durante los ejercicios.

Las escenas de diálogo y enojo son ficción original del juego. La versión no reproduce conversaciones reales.

## Circuitos

`game/circuit-roster.ts` resuelve equipos, perfiles y cantidad de rondas. El femenino comienza en semifinales y termina en final; el masculino conserva cuartos, semifinal y final. El mismo selector sirve para todos los modos. La configuración persiste el circuito y vuelve a índices válidos al cambiarlo. `game/circuit-roster.test.ts` recorre todos los equipos, verifica rivales distintos y completa un partido femenino con puntuación real, pausas y sin festejo exclusivo de Lebrón.
