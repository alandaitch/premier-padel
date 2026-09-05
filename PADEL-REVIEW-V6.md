# Auditoría V6 · reglas, técnica y flujo de partido

Auditoría cerrada el 5 de septiembre de 2026. El auditor no modificó el producto. Se inspeccionaron referencias primarias, escenas del renderer y secuencias guardadas del motor. La mejora funcional de V6 aprueba dentro del alcance observado; los humanos y la animación todavía no alcanzan Virtua Tennis 4.

## Reglas verificadas y consecuencias

Fuente principal: [FIP, reglas con aplicación 01.01.2026](https://www.padelfip.com/wp-content/uploads/2025/12/FIP_Rules-of-Padel-1.pdf), páginas 12, 13, 17–19. Contraste en la [versión española publicada por la Federación Española](https://www.padelfederacion.es/refs/docs/FIP_Reglas-del-Padel01012026.pdf).

| Caso | Criterio reglamentario |
| --- | --- |
| Devolución desde fuera | Permitida con juego exterior autorizado; debe cumplir las condiciones normales de devolución. |
| Pelota contra cara rival de la red | Puede ser válida si después pica en campo rival. Tocar esa cara no concede inmediatamente el punto. |
| Puerta opuesta sin pique rival | Devolución inválida, salvo intervención rival antes de caer. |
| Puerta opuesta después de pique rival | Pelota viva hasta segundo pique u objeto ajeno. |
| Salida por fondo después de pique válido | Punto terminado al superar el fondo. |
| Cuerpo/pala contra red o campo rival | Pierde el jugador que toca mientras la pelota está viva; la excepción del poste medianero requiere las condiciones específicas de 13.1b. |
| Primer juego del set | Cambio de lado sin descanso. |
| Juegos impares posteriores | Cambio de lado, descanso máximo de 90 segundos. |
| Fin de set | Descanso máximo de 120 segundos. |
| Tie-break | Cambio cada seis puntos, sin descanso; se permiten 20 segundos para cambiar. |

La aplicación a la cara rival de la red y a atravesar ambas puertas es una lectura conjunta de 14.1e/j y las reglas de primer pique. No se encontró una nueva excepción que permita omitir el pique rival en una devolución exterior. El toque de red por la **pelota** y por el **jugador** requieren decisiones diferentes.

## Casos propuestos para regresiones

Propuesta del auditor basada en el flujo del motor y sus puertas compartidas:

1. Iniciar con el feed real de Remate; producir por 3; correr por la puerta; devolver bajo por el acceso rival; red; pique rival; continuación. Registrar dueño de golpe, receptor y orden de eventos.
2. Variar únicamente dirección/velocidad de esa devolución para atravesar ambas puertas sin pique. Comprobar que el error se atribuya al devolvedor.
3. Repetir haciendo que pique antes de salir por la puerta opuesta. Comprobar continuidad y posibilidad de otra recuperación.
4. Reflejar el rally en ambos laterales y después de cambiar de lado. Mantener simetría de reglas y dueño del golpe.
5. Añadir contacto prematuro con cara exterior del cerramiento, poste y red. Separar cada superficie y el momento del primer pique.
6. Completar marcadores naturales: primer juego, tercer juego, fin de set, sexto punto del tie-break y siguiente set. Comprobar que un cambio sin descanso no abra una escena de banco.

Los fixtures geométricos ayudan a aislar fallos, pero al menos una recuperación debe empezar mediante saque/feed y golpes reales, sin recolocar pelota o cuerpos durante el rally. La línea visual de zona segura no debería convertirse en una pared física de la pelota.

## Videos primarios inspeccionados en V6

La inspección utiliza reproducción y pausas en el navegador, con lectura del tiempo visible. Son secuencias muestreadas, no mediciones biomecánicas ni una grabación continua de análisis de movimiento.

| Fuente | Momentos realmente vistos | Criterio útil para el juego |
| --- | --- | --- |
| [Premier Padel: rescate de Jensen](https://www.youtube.com/watch?v=Ota8oMac5Fc), canal oficial verificado | 0:10 contacto exterior alto; repetición cercana a 0:15, tras reproducir la secuencia | Preparación durante la carrera, zancada y torso que acompañan salida y frenado. Evitar giro instantáneo con pies inmóviles al llegar. El clip muestra devolución alta; no se usa como prueba de una devolución baja a la red. |
| [Paquito Navarro: La Bandeja](https://www.youtube.com/watch?v=5c52jcX5HQU), DaleCandela TV | Reproducción 1:58–2:13; armado 2:08; demostración de bandeja 2:10; contraste de víbora 2:13 | En su demostración, bandeja entra por debajo con cara más abierta; víbora presenta cara más vertical y entrada lateral. Las dos necesitan espacio al costado del cuerpo. Es enseñanza directa del jugador, no una jugada competitiva. |
| [The Padel School: bandeja](https://www.youtube.com/watch?v=DVQL4hUMnjw), canal verificado | 1:08, 1:22, 1:33, con reproducción entre fases | Armado alto de perfil; contacto a altura de cabeza pero lateral/delante; final cruzado y peso que avanza. No basta una pala encima de la frente. |
| [The Padel School: víbora](https://www.youtube.com/watch?v=PihyQF3EnHk), canal verificado | 1:19, 1:27 y 1:42, con reproducción entre fases | Giro de hombros mientras se extiende el codo; contacto lateral algo por encima de cabeza en esta variante; recuperación hacia delante. La altura sola no distingue el golpe. |
| [Saska Huttunen con The Padel School: topspin smash](https://www.youtube.com/watch?v=9gQAQ-1H-sE) | Explicación 2:58 y secuencia 3:13–3:15 | Carga de piernas, posición bajo la pelota, armado detrás, rodilla que acompaña despegue, extensión y rotación corporal. La demostración permite distinguir un remate liftado potente del barrido de control. |

El [artículo del entrenador con Huttunen](https://thepadelschool.com/padel-tips/the-biggest-padel-smash-in-finland) vincula profundidad del pique con distancia a la red: desde más atrás propone profundidad mayor; desde cerca, buscar altura contra el vidrio. Para el motor, **paralelo describe dirección**, mientras que liftado describe efecto. No corresponde garantizar una salida o agregar energía al vidrio para imponerla.

Estos criterios fueron comunicados al renderer y a integración antes de la pasada final. Una variante técnica profesional distinta puede aprobar si mantiene contacto, equilibrio y recuperación plausibles; no se impone una pose única.

## Criterios de inspección de la integración

- Controles: instrucciones coherentes con botones/teclas, carga visible, dirección y contacto real. Separar teclado sostenido de controles accesibles probados con pulsaciones.
- Bandeja y víbora: preparación, contacto, terminación y reproducción; pelota al costado apropiado, muñeca/cara de pala, apoyo y transferencia.
- Rescate: recorrido por acceso, devolución baja/alta, primer pique correcto y continuación; sin atravesar paredes ni adjudicar el punto prematuramente.
- Entrenadores: aparición vinculada a descansos válidos; diálogo y vuelta a juego sin cambiar indebidamente marcador o servicio.
- Celebraciones: dispararse tras cierre real de punto/partido, respetar equipos y permitir continuar.
- Benchmark: conservar las [referencias oficiales de VT4 y comparación V5](PADEL-REVIEW-V5.md). Una mejora concreta no acredita por sí sola paridad de modelos o animación.

## Dictamen de integración

**APROBADO FUNCIONAL CON LÍMITES.** No quedó un bloqueo funcional nuevo en las escenas inspeccionadas. Esta aprobación permite cerrar la iteración; no acredita paridad visual con VT4 ni una certificación completa de las reglas.

La evidencia propia se obtuvo en Chrome, mediante controles visibles del inspector `work/v6-review`. Las escenas de banco, celebración y regreso usan estados preparados, claramente rotulados. Los golpes provienen de un partido simulado por `PadelMatch`, con posiciones y contactos guardados; la cámara cercana es del inspector. Se reprodujeron secuencias y se tomaron muestras entre fases. No se midieron cadencia de cuadros, biomecánica o latencia de teclado.

| Ítem | Dictamen y observación |
| --- | --- |
| Banco y entrenador | **APROBADO funcional.** La primera versión dejaba pies flotando. Tras corrección, jugadores apoyan pies y pelvis plausiblemente; entrenador conversa delante/lateralmente. En reproducción cambian brazos y cabeza. La actuación sigue simple. |
| Caminata y regreso | **APROBADO en las muestras.** Caminata al 40% muestra jugadores en recorridos exteriores por accesos. Regreso con cambio de lado fue comprobado al 80% y 99%. La obstrucción final por vigas/cartel se corrigió: cancha y cuatro cuerpos quedan visibles. No se siguió cada pie durante todo el trayecto. |
| Celebración | **APROBADO funcional.** Fixture con pareja separada ocho metros conserva ambos cuerpos completos. Reproducción observada y muestreada al 69%. Gestos reconocibles pero poco variados; no equivalen a actuación natural de VT4. |
| Bandeja | **APROBADO como golpe; fidelidad técnica PARCIAL.** Armado, contacto, terminación y transición reproducidos. Hay giro, preparación alta y final cruzado. El contacto de Tapia a 1,99 m cae ligeramente hacia su revés y genera una postura menos limpia que las referencias profesionales. El renderer confirmó que resuelve el contacto físico, sin que la preparación lo sobreescriba. No se da por resuelta toda colocación lateral. |
| Víbora | **APROBADO como golpe; fidelidad técnica PARCIAL.** Contacto y salida visibles; terminación más baja y recuperación diferenciada. Muestreo en reproducción confirma variación temporal. Falta la continuidad corporal y transferencia de peso de los videos profesionales. |
| Otros golpes y rescate exterior V6 | **VERIFICACIÓN VISUAL LIMITADA.** Esta pasada no revalidó en secuencia todas las familias ni una recuperación exterior completa de V6. Fuentes reglamentarias y casos propuestos arriba; la integración y pruebas corresponden al integrador. No extrapolar la aprobación de dos golpes a todos. |
| Modelos, ropa y público frente a VT4 | **NO ALCANZA.** Anatomía segmentada, facciones estilizadas, cabello volumétrico repetido y ropa con poca deformación. El público amplifica la repetición en cámaras cercanas. Las mejoras funcionales no eliminan esa diferencia. |
| Sonido | **SIN NUEVA VERIFICACIÓN AUDITIVA.** Esta auditoría no escuchó ni comparó la mezcla V6. |

La referencia visual de nivel comercial sigue siendo [Virtua Tennis 4, página oficial de SEGA en Steam](https://store.steampowered.com/app/71390/Virtua_Tennis_4/), incluyendo el [primer plano oficial](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/71390/ss_5d0aedf8f2271a7326d9a018fb23730d8f846fb6.1920x1080.jpg?t=1732637599) y la [captura de juego](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/71390/ss_e6104a925edbac4eca52568a1e1da91be595af27.1920x1080.jpg?t=1732637599), inspeccionados en V5. No se afirma una comparación instrumental de fluidez contra VT4 a partir de esas imágenes.

### Evidencia propia conservada

Todos estos archivos son capturas reales del navegador, sin retoque:

- [Banco corregido, lateral](outputs/visual-audit-v6/bench-medio-lateral-corregido.jpg) y [conversación en reproducción](outputs/visual-audit-v6/bench-conversacion-secuencia.jpg).
- [Recorrido exterior al 40%](outputs/visual-audit-v6/walk-cambio-cuarenta-cenital.jpg).
- [Regreso al 99%, cámara corregida](outputs/visual-audit-v6/return-cambio-noventaynueve-corregido.jpg).
- [Celebración, pareja separada ocho metros](outputs/visual-audit-v6/celebracion-pareja-ocho-metros.jpg).
- Bandeja: [armado](outputs/visual-audit-v6/bandeja-armado-final.jpg), [contacto](outputs/visual-audit-v6/bandeja-contacto-final.jpg), [terminación](outputs/visual-audit-v6/bandeja-terminacion-final.jpg).
- Víbora: [contacto](outputs/visual-audit-v6/vibora-contacto-final.jpg) y [terminación](outputs/visual-audit-v6/vibora-terminacion-final.jpg). El ángulo lateral del contacto contiene una oclusión parcial por el compañero; se cambió de ángulo para inspeccionar la recuperación.

Las capturas iniciales y el archivo `bench-diez-corregido.jpg` no respaldan el resultado final: este último se tomó antes de que terminara el primer render.

### Evidencia de integración comunicada por el integrador

Se registra separadamente; no fue observación directa de este auditor:

- Partido real hasta terminar el primer juego: celebración, pausa/reanudación, omisión con Espacio, marcador 0–1 y servidor rival correcto.
- El integrador informó 71 pruebas y tipado correctos; después confirmó el build final correcto.
- La cámara al omitir la escena fue corregida y comprobada por el integrador.

Las instrucciones, tecla sostenida, carga y dirección no se volvieron a recorrer personalmente en V6. Las pruebas de controles de V5 y el flujo observado por el integrador no se presentan como nueva prueba exhaustiva del auditor.

### Orden de mejora posterior

1. Modelos humanos continuos, ropa que deforme y cabello menos esquemático: mayor diferencia visible frente a VT4.
2. Transferencia de peso, apoyos y transición entre armado/contacto/recuperación; priorizar bandejas incómodas y contactos laterales.
3. Variación y continuidad de actuación en banco, celebraciones y encuentros entre jugadores.
4. Pasada visual completa de rescates, golpes restantes y cambios de lado ya iniciados; complementar regresiones físicas con secuencias observables.
5. Público cercano y verificación perceptual del sonido.

Estos puntos son mejoras futuras registradas. La auditoría V6 está cerrada y no solicita otra ronda de pulido para esta entrega.
