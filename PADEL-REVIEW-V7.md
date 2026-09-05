# Auditoría V7 · festejo de Lebrón

**CERRADA · 5 de septiembre de 2026. APROBADO funcional para esta iteración.** El gesto se reconoce, mantiene la camiseta entre ambas manos y termina mostrándola hacia los rivales. Los últimos ajustes de contorno y encuadre son suficientes. No se solicita otra ronda de pulido.

## Referencia inspeccionada

[Clip indicado por Alan](https://www.youtube.com/shorts/bRjpnMPQMEM), reproducido en su [reproductor normal](https://www.youtube.com/watch?v=bRjpnMPQMEM). Es una publicación de Al Toque Padel que reutiliza imágenes de retransmisión; no se atribuye al canal oficial del torneo.

Observación propia en navegador: abrazo inicial; después Lebrón con torso descubierto, camiseta separada y extendida hacia los rivales próximos a la red; exhibición alta y repetición cercana al final. Se vieron muestras con tiempos visibles aproximados 0:10, 0:12 y 0:19. El montaje y sus cortes no permiten reconstruir una retirada continua de la camiseta. El gesto solicitado se interpreta como celebración con prenda; no como agresión física.

## Criterios verificables

1. Activación solamente después de una victoria de partido cuya pareja incluya a Lebrón. Probar ambos equipos y posiciones dentro de la pareja. No habilitar por punto, juego o set, con Lebrón ausente o perdedor.
2. Secuencia lógica `down, down, up, right, base, control`; por defecto `S S W D J K`. Respetar remapeo y mostrar las teclas actuales. No contar repetición automática como otra pulsación.
3. No acumular pulsaciones anteriores a la victoria. Disponibilidad durante ocho segundos de presentación; una única activación. Errores, tiempo agotado, omisión y reinicio deben conservar estados coherentes.
4. El intento tiene límites propios: 900 ms entre pulsaciones y 3200 ms en total, según el módulo actual. Comprobar el borde y el reinicio del intento; distinguir esos límites de la ventana de victoria.
5. Marcador, ganador y resultado permanecen intactos. Pausa no dispara ni repite la escena. Una nueva partida devuelve la vestimenta normal.
6. Retirada comprensible, torso descubierto y camiseta independiente entre ambas manos. Evitar prenda que aparece suspendida, brazos atravesados o duplicación persistente.
7. Exhibición dirigida hacia los rivales; nombre y orientación legibles, sin espejo. Cámara conserva cabeza, manos, camiseta y destinatarios sin obstrucciones materiales.
8. Reproducir la transición completa y muestrear retirada, exhibición y final. Una pose congelada no acredita toda la animación.

## Alcance de evidencia

La inspección propia usa el renderer del producto en escenas preparadas, rotuladas como inspector, en Chrome y `work/v7-review`. No modifica marcador ni representa una victoria real. Se inspeccionaron los cuatro lugares posibles de Lebrón y ambos valores de `endsSwapped`; los lugares 1/2 se comprobaron antes del ajuste final de contorno/cámara, y 0/3 después. Se volvió a reproducir la animación final desde el comienzo hasta su término, con muestras visibles durante la retirada y al finalizar. No se realizó una medición cuadro a cuadro de toda la secuencia.

| Ítem | Dictamen y evidencia |
| --- | --- |
| Agarre y retirada | **APROBADO funcional.** Manos en el borde inferior al comienzo; subida de brazos; torso descubierto; prenda separada sobre la cabeza. Fases 16%, 28%, 36% y 45% inspeccionadas. |
| Exhibición | **APROBADO.** Ambas manos sostienen la prenda; apellido «LEBRÓN» legible y sin espejo. El contorno escalonado inicial fue corregido. La prenda más baja despeja el rostro. |
| Destinatarios y cámara | **APROBADO.** Primero se lee la camiseta de cerca; el plano lateral final incorpora los rivales y muestra la separación entre torso y prenda. Los cuerpos relevantes quedan dentro del cuadro. |
| Ubicación de Lebrón | **APROBADO en las muestras.** Jugadores 0, 1, 2 y 3; equipos y lados invertidos conservan sujeción y orientación legible. No se ensayaron todas las separaciones posibles entre cuatro jugadores. |
| Restauración | **APROBADO.** Al retirar la presentación, vuelven camiseta, mangas y pala normal. Comprobado visualmente en jugadores 0 y 3; desaparece la camiseta suelta. |
| Activación y restricciones | **APROBADO con evidencia de código y del integrador.** El director exige final de partido, ganador coincidente y Lebrón dentro de esa pareja; una sola activación. El llamador filtra repeticiones y limpia prefijos al comenzar la escena. Los casos negativos no se repitieron manualmente en el navegador del auditor. |
| Fidelidad corporal y tela | **PARCIAL.** El gesto resulta comprensible, pero la tela se comprime de manera esquemática y cambia de malla al liberarse. No hay simulación realista de mangas pasando por brazos. Rostro, anatomía segmentada y movimientos siguen estilizados, por debajo del benchmark VT4 documentado previamente. |

## Evidencia propia final

Capturas reales del navegador, sin retoque:

- [Elevación al 28%](outputs/visual-audit-v7/elevacion-28-final.jpg) y [liberación al 36%](outputs/visual-audit-v7/liberacion-36-final.jpg).
- [Exhibición corregida, jugador 0 y lados invertidos](outputs/visual-audit-v7/exhibicion-jugador0-invertido-final.jpg).
- [Jugador 3, lados invertidos](outputs/visual-audit-v7/exhibicion-jugador3-invertido.jpg) y [lados originales](outputs/visual-audit-v7/exhibicion-jugador3.jpg).
- [Plano final hacia los rivales](outputs/visual-audit-v7/exhibicion-rivales-final.jpg).
- [Retirada muestreada durante reproducción](outputs/visual-audit-v7/secuencia-retirada-final.jpg) y [final de la reproducción](outputs/visual-audit-v7/secuencia-final.jpg).
- [Restauración de jugador 0](outputs/visual-audit-v7/restauracion-jugador0.jpg) y [restauración final de jugador 3](outputs/visual-audit-v7/restauracion-jugador3-final.jpg).

Las capturas con sufijo `inicial` documentan la versión anterior al ajuste de contorno y encuadre. No se usan para acreditar esos dos arreglos.

## Integración comprobada por el integrador

Evidencia comunicada por root, separada de la inspección propia:

- Partido real local perdido 0–3 contra Lebrón/Augsburger, sin inyectar estados. Durante el aviso elegible pulsó `S S W D J K` con CUA: aparecieron «EL LOBO · FESTEJO ESPECIAL» y «Festejo desbloqueado», conservando el marcador.
- Ayuda real muestra combinación, ventana de ocho segundos, intento de seis pulsaciones en 3,2 segundos, esquema clásico y cruceta.
- Revancha local con camisetas restauradas.
- Dieciséis pruebas del combo y director informadas como correctas: victoria/derrota, posiciones de Lebrón, exclusión de punto/juego/set, límites temporales, repetición, acciones remapeadas y reinicio. El auditor leyó las condiciones y casos; no presenta esa ejecución como propia.

No se escuchó el efecto de sonido ni se repitió con un mando físico conectado. Esos límites no impiden cerrar el gesto y la entrada de teclado acreditada.

## Mejoras futuras

1. Deformación de tela y continuidad de mangas al quitarse la camiseta.
2. Dedos, agarre fino y expresión facial más natural.
3. Variaciones de reacción y más posiciones de cámara ante separaciones extremas.

No queda un fallo funcional nuevo abierto en el alcance inspeccionado. La aprobación corresponde a este festejo; no afirma paridad global con Virtua Tennis 4.
