# Renderer V7 — festejo especial de Lebrón

Cambio acotado a `game/renderer.ts`. El disparador secreto, la victoria requerida, su ventana y la duración pertenecen al director de partido. El renderer recibe `PresentationState.phase = 'signature'`, `progress` entre 0 y 1, y `signaturePlayerId` con el índice exacto 0–3. La entrada se detecta aunque conserve el mismo identificador de punto de la celebración anterior.

## Referencia observada

Se abrió y reprodujo el [clip proporcionado por el usuario](https://www.youtube.com/shorts/bRjpnMPQMEM), también mediante el [reproductor normal del mismo video](https://www.youtube.com/watch?v=bRjpnMPQMEM). Es una edición de Al Toque Padel de aproximadamente veinte segundos, no una publicación del canal oficial del circuito.

Se observaron el abrazo inicial, el torso descubierto y la exhibición posterior: la camiseta queda separada del cuerpo, sujeta por sus extremos superiores y orientada hacia los rivales próximos a la red. En torno a 0:15 se ve la prenda extendida delante del torso. El auditor también revisó la exhibición alrededor de 0:12 y el cierre de 0:19. La retirada completa no aparece como una secuencia continua y detallada: esa transición se reconstruyó para el juego. No se incorporaron el video, su audio, sus comentarios ni una voz imitada.

## Fases implementadas

| Progreso | Acción visual |
| --- | --- |
| 0–12% | Aparta la pala y lleva ambas manos al dobladillo. |
| 12–36% | Recoge la camiseta hacia arriba, descubre el torso y eleva la prenda por encima de la cabeza. |
| 36–55% | La camiseta ya separada se despliega entre ambas manos. |
| 55–72% | Exhibe la espalda con apellido y marca legibles hacia el equipo rival. |
| 72–100% | Mantiene el gesto y la cámara abre una toma lateral que incluye al rival más próximo. |

La duración total actual del director es 8,8 segundos. Las manos usan una solución articulada de hombro y codo hacia los puntos de agarre. La camiseta vestida se deforma desde su geometría original; luego pasa a una prenda independiente con cuello, mangas, borde suave, pliegues y caída. Conserva colores, patrón, apellido y marcas del perfil seleccionado. El torso adulto y los hombros usan superficies continuas de piel bajo la camiseta.

La cámara cercana deja visibles cabeza, manos, prenda y cuerpo. La toma final establece el destinatario del gesto sin trasladar artificialmente a los rivales. Funciona con ambos extremos del estadio mediante la transformación existente de `endsSwapped`.

Al salir de `signature`, omitirla o reiniciar, se restauran la geometría y los accesorios de la camiseta vestida. La prenda separada y la pala apartada se ocultan; el jugador vuelve a llevar su pala habitual. La escena no modifica pelota, marcador, ganador ni reglas.

## Validación

- TypeScript, lint del renderer y comprobación de espacios del diff: aprobados.
- Verificación geométrica temporal: 28 anclajes de mano, cubriendo siete fases, ambos brazos y las dos orientaciones de extremo. Error de muñeca a agarre redondeado a seis decimales: 0 m.
- Restauración comprobada de geometría, accesorios, visibilidad de camiseta, torso y pala.
- Inspección propia del fixture V7: retirada y exhibición. El contorno escalonado inicial se reemplazó por una silueta curva subdividida; la exhibición se bajó para despejar el rostro.
- Auditor independiente: manos y apellido legibles, camiseta separada, orientación a rivales y toma final aprobadas. Evidencia en `outputs/visual-audit-v7/` e inspector rotulado en `work/v7-review/`.
- Integración de root: victoria real, entrada del combo, festejo y revancha con vestimenta restaurada. Esa prueba pertenece al informe de integración; el fixture visual no sustituye una victoria real.

## Límites

La retirada es una reconstrucción articulada y la tela usa deformación procedural. No simula colisiones completas entre dedos, cuello, mangas y cuerpo. La sustitución entre prenda recogida y camiseta separada ocurre al superar la cabeza. Los modelos humanos mantienen el nivel estilizado de V6; este cambio se concentra en el festejo completo y legible.
