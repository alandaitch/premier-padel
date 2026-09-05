# Premier Padel — revisión de dinámica V2

Fecha: 4 de septiembre de 2026. Auditoría independiente de la mejora de pádel. La aceptación de esta iteración no exige resolver toda la distancia visual respecto de Tennis Elbow 4.

## Dictamen y evidencia

**APROBADO como mejora funcional específica de pádel.** Se incorporaron decisiones de pared, retorno, pareja y golpes diferenciados. No son solamente etiquetas nuevas. **La calidad dinámica visual queda PENDIENTE**: no hubo secuencia suficiente para aprobar contacto, apoyos o giro.

Evidencia utilizada:

- Inspección directa de la captura real [doble-pared-v2.jpg](outputs/doble-pared-v2.jpg), 1280 × 720. Muestra entrenamiento de doble pared en fase **PUNTO**, con motivo “Doble pique”. No demuestra por sí sola dos impactos de vidrio ni una devolución.
- Lectura de `game/physics.ts`, los casos nuevos de `game/physics.test.ts` y la integración de contacto y movimiento en `game/renderer.ts`.
- El agente principal confirmó la ejecución final de **27/27 pruebas**, tipado correcto y compilación de producción correcta. Este auditor revisó los casos; no repitió la ejecución mientras física editaba.
- Prueba manual comunicada por el agente principal: menú→Partido rápido→marcador y SACAR; clic inicia saque y el marcador avanza a 15. En entrenamiento observó instrucción de dos vidrios, bola profunda y jugador esperando. Se identifica como observación del agente principal, no como recorrido propio de este auditor.
- La ampliación de prueba visual quedó impedida por el bloqueo de macOS. No se afirma haber observado el remate en contacto ni la defensa sobre la red en esta versión.

## Evaluación por componente

| Componente | Dictamen | Evidencia y límite |
|---|---|---|
| Esperar vidrio | **APROBADO FUNCIONAL** | `B` inhibe golpe prematuro; la predicción espera los vidrios previstos. Pruebas acreditan ventana de devolución humana después del rebote. Secuencia de giro pendiente. |
| Doble pared | **APROBADO FUNCIONAL** | Ejercicio conserva un pique de suelo y dos contactos de vidrio, después admite globo humano. No hay prueba explícita de ambos órdenes lateral→fondo/fondo→lateral ni captura secuencial. |
| Remate que vuelve | **APROBADO FUNCIONAL** | Trayectoria integrada: pique, fondo, cruce de regreso; no acaba al cruzar la red. Sin devolución termina al segundo pique. |
| Receptor sobre red | **APROBADO FUNCIONAL** | Sólo la pareja receptora puede tocar el retorno; la prueba rechaza rematador y compañero, conserva pies del receptor en su campo y devuelve legalmente. No hay colisión corporal completa con red/postes. Animación pendiente. |
| Por tres / por cuatro | **APROBADO EN LOS ESCENARIOS PROBADOS** | Tres modalidades responden desde un globo real del ejercicio y la potencia del botón. Por tres lateral tras pique y por cuatro finalizan. Hay asistencia de lanzamiento, efecto y restitución; no equivale a un modelo calibrado de pelota/pala. |
| Recuperación exterior | **NO IMPLEMENTADA** | Salir termina el punto. Falta modalidad con acceso exterior, persecución y devolución fuera de pista. No debe presentarse como regla universal: FIP permite juego exterior autorizado en ciertos segmentos. |
| Contrapared | **APROBADO FUNCIONAL** | La pelota viaja primero al cristal propio, rebota físicamente y llega al suelo rival. Prueba distingue ese contacto de vidrio del pique de suelo. |
| Bajada | **APROBADO FUNCIONAL** | Requiere rebote de vidrio; sin éste se sustituye por un golpe elegible. No se acreditó gesto y transferencia de peso en una secuencia. |
| Bandeja y víbora | **APROBADO EN DIFERENCIACIÓN** | Velocidad, corte y rebote distintos; prueba verifica víbora más rápida y baja. El balance entre riesgo, control y recuperación necesita partidos humanos. |
| Chiquita / dejada / volea | **APROBADO EN DIFERENCIACIÓN; TÁCTICA PARCIAL** | Chiquita tiene caída más profunda y lenta que dejada; volea tiene trayectoria propia. Chiquita apunta a profundidad fija próxima a la red, sin seguir los pies reales del oponente. |
| Pareja y globo | **APROBADO FUNCIONAL; IA PARCIAL** | Destinos compartidos, receptor designado y compañero en cobertura. Prueba verifica subida conjunta y giro rival tras globo. La selección incluye patrones basados en cantidad de golpes; no es evaluación táctica completa. |
| Saque y let | **APROBADO EN LOS CASOS PROBADOS** | Conserva saque de abajo, pique diagonal y dos intentos. Red→cuadro→malla es falta. Auditor detectó que contacto receptor tras red/cuadro podía continuar el rally; quedó corregido y cubierto por prueba 27. |
| Star Point | **APROBADO EN MARCADOR; UI PENDIENTE DE RECORRIDO** | Pruebas existentes conservan dos ventajas y punto decisivo. Hay selección de lado en código. Este auditor no recorrió ese caso visual en V2. |
| Diez golpes, ejercicios y ayuda | **APROBADO EN PRESENTACIÓN** | Captura muestra diez opciones legibles, cuatro ejercicios y `B Esperar vidrio`. Instrucción de dos vidrios queda debajo de pista. La captura no permite verificar el selector de tres remates. |
| Cámara y pista | **APROBADO EN PRESENTACIÓN** | Cuatro cuerpos completos, red y líneas visibles. HUD inferior y panel lateral no cubren la pista. Se conserva el frente desvanecido del ajuste anterior. |
| Preparación, brazo, salto y giro | **PENDIENTE VISUAL** | Renderer utiliza contacto de física para orientar brazo/pala y añade preparación, recuperación, salto y movimiento de pared. Leer estas ramas no demuestra continuidad, precisión de contacto ni apoyos naturales. |
| Humanos, ropa y público contra TE4 | **NO ALCANZA** | La captura mantiene anatomía simplificada y público de siluetas repetidas. TE4 muestra personas y vestimenta más reconocibles. No bloquea esta mejora puntual. |
| Sonido | **PENDIENTE DE ESCUCHA; RECURSOS POR MEJORAR** | No hubo evaluación auditiva real. Permanece la base procedural de V1; no se acreditó una mejora sonora nueva. |

## Comparación visual conservada con TE4

La revisión anterior inspeccionó realmente imágenes oficiales de Mana Games y Steam. Se mantiene esa referencia: [cancha azul y encuadre](https://static.managames.com/Images/TennisElbow4/TE4_ss05.jpg), [saque indoor y cuerpo cercano](https://static.managames.com/Images/TennisElbow4/TE4_ss03.jpg), [anatomía y ropa](https://static.managames.com/Images/TennisElbow4/TE4_ss10_en.jpg). Método completo y otras imágenes: [TE4-REVIEW.md](TE4-REVIEW.md).

La captura V2 alcanza la claridad de pista, iluminación y jerarquía de interfaz requeridas. El público sigue formado por cuerpos geométricos repetidos y la ropa ofrece poca variación material. La mayor diferencia visible respecto de esas imágenes está en personas y tribunas. La animación no recibe aprobación comparativa con una captura estática.

## Orden de mejora sugerido

1. **Verificar contactos en movimiento:** grabar pared simple/doble, bajada, remate alto y devolución sobre red. Corregir sólo saltos, deslizamientos o separación pala/pelota que aparezcan.
2. **Afinar decisiones y tacto:** chiquita dirigida al rival, calidad de globo, margen de error y selección de IA. Probar rallies humanos completos con y sin ayuda.
3. **Completar situaciones reglamentarias pendientes:** recuperación exterior, accesos y faltas de cuerpo/red; probar ambos órdenes de doble pared.
4. **Mejorar personas y materiales:** cuerpo, manos y ropa antes de añadir más espectadores. Variar posturas del público existente.
5. **Evaluar sonido con escucha real:** distinguir pala, pique, cristal, malla y pasos; después añadir muestras propias.

Fuentes normativas y enseñanza primaria trazables: [PADEL-DYNAMICS.md](PADEL-DYNAMICS.md). No quedó un defecto nuevo bloqueante conocido después de corregir el let; permanecen las limitaciones declaradas y la verificación visual dinámica pendiente.
