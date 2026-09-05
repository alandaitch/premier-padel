# Premier Padel — auditoría de realismo V4

Fecha: 4 de septiembre de 2026. Estado: revisión V4 cerrada, incluyendo las muestras físicas definitivas.

## Método y evidencia

La vara visual es Tennis Elbow 4, sin exigir superarlo. Las referencias de pádel real sirven para postura, equipo y intención del golpe; no elevan la meta a fotorrealismo. Una captura no demuestra apoyos, continuidad de movimiento, timing ni sensación de control.

Se abrieron e inspeccionaron directamente las capturas locales `outputs/gameplay-check-01.jpg`, `02.jpg` y `03.jpg`. Son tres fotogramas reales del gameplay anterior, 960 × 540. No son evidencia de la implementación V4 que se desarrolla en paralelo. Su marcador muestra un rally con 5, 24 y 36 golpes, respectivamente; esto no permite inferir por sí solo ritmo o duración.

Se inspeccionaron otra vez, en una pestaña propia de Chrome, las imágenes oficiales de TE4 y las fotografías reales de pádel siguientes. No se descargaron assets para incorporarlos al juego ni se usaron mods, imágenes generadas o renders conceptuales.

## Referencias primarias consultadas

| ID  | Fuente                                                                                                                                                                                      | Uso válido en esta revisión                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | [Mana Games: TE4 pista azul](https://static.managames.com/Images/TennisElbow4/TE4_ss05.jpg)                                                                                                 | Imagen inspeccionada: superficie, público sentado, equipamiento, anatomía y postura amplia del jugador cercano.                                                                                                                                                                   |
| T2  | [Mana Games: TE4 saque indoor](https://static.managames.com/Images/TennisElbow4/TE4_ss03.jpg)                                                                                               | Imagen inspeccionada: cuerpo articulado, ropa, cabello, manos, sombras y gradación de luz del estadio. No prescribe el saque de pádel.                                                                                                                                            |
| P1  | [LTA: foto de preparación alta](https://www.ltapadel.org.uk/globalassets/padel-play/adults/padel-player-overhead.jpg)                                                                       | Foto inspeccionada: pala alta, codo armado, mano libre orientada y compañera con base amplia. Fotografía de enseñanza; no certifica biomecánica profesional.                                                                                                                      |
| P2  | [LTA: foto de golpe de pádel](https://www.ltapadel.org.uk/globalassets/information-articles/woman-hitting-padel-backhand.jpg)                                                               | Foto inspeccionada: pala sólida/perforada, manos, ropa, grosor de marco y diferencias materiales.                                                                                                                                                                                 |
| P3  | [Premier Padel: fotografía oficial de jugadora](https://cdn.premierpadel.com/uploads/news/compress/thumbnail/original/4c7db19916399fb12ebbd8aa06dacd3a70d333e6352510e6e228db06e3a11cd2.jpg) | Foto inspeccionada desde imágenes publicadas en [noticias oficiales](https://premierpadel.com/en/news/stars-shine-on-return-to-madrid-as-abbate-rodrguez-spring-the-days-surprise): musculatura, muñequera, paneles perforados y caída de ropa. No es foto de contacto de pelota. |
| C1  | [LTA: volea](https://www.ltapadel.org.uk/play/padel-tips-and-techniques/volleys/)                                                                                                           | Texto técnico leído: pala preparada por encima de la red, paso con pie opuesto, contacto delante y recorrido corto.                                                                                                                                                               |
| C2  | [LTA: bandeja y remate](https://www.ltapadel.org.uk/play/padel-tips-and-techniques/overheads-bandeja-and-the-smash/)                                                                        | Texto leído: preparación lateral temprana, contacto de bandeja aproximadamente a altura de ojos, trayectoria de pala cruzada y recuperación junto a la pareja. El remate utiliza extensión alta.                                                                                  |
| C3  | [LTA: habilidades iniciales](https://www.ltapadel.org.uk/play/how-to-get-started-playing-padel/skills-for-beginners/)                                                                       | Texto leído: pasos laterales cortos, preparación previa al vidrio y desplazamiento de ambos compañeros.                                                                                                                                                                           |
| V1  | [LTA oficial: Padel Made Easy, volea](https://www.youtube.com/watch?v=qS7_j8zfOFc)                                                                                                          | Reproductor abierto e inspeccionado en 0:06, 0:11, 0:21, 0:26 y 0:31. En 0:26–0:31 muestra espera, base ampliada y paso hacia el golpe. Es muestreo de fotogramas del video real; no análisis biomecánico continuo ni evaluación auditiva.                                        |

Límite de las fuentes: la miniatura de highlights publicada por Premier Padel resultó ser un logotipo; se descartó como referencia de acción. El video oficial de LTA sí se abrió y muestreó como se describe arriba. Los textos técnicos se usan como criterios, no como mediciones del juego.

## Seis deficiencias concretas del estado anterior

| Prioridad | Deficiencia observable                                                                                                                             | Evidencia                                 | Criterio verificable de aceptación                                                                                                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | **Anatomía y silueta poco humanas.** Torso recto, extremidades finas, cabeza y manos muy simples. Las cuatro siluetas se parecen mucho.            | G01–G03 frente a T1/T2.                   | En cámara cercana, hombro, codo, antebrazo, muñeca y muslo forman un cuerpo continuo. En transmisión se distinguen jugadores por proporción/silueta, además del color. No se exige parecido facial perfecto.   |
| 2         | **Espera demasiado erguida y pala baja al costado.** En las capturas de red, varios jugadores parecen parados entre puntos.                        | G02/G03 frente a C1/P1.                   | En rally, receptor de red espera con base amplia, rodillas flexionadas y pala delante/alta. En defensa prepara el lado del contacto. Comprobar que la pose reaparece después de recuperar.                     |
| 3         | **Ropa y accesorios con acabado uniforme.** Camisetas y shorts se leen como piezas lisas; manos, tela y pala comparten poca variación superficial. | G01–G03 frente a T2/P2/P3.                | Se leen cuello, mangas, costuras o pliegues y zonas materiales distintas. La pala conserva espesor, perforaciones y empuñadura. El resultado alcanza el detalle visible de TE4, sin exigir simulación de tela. |
| 4         | **Público compuesto por columnas repetidas.** Cuerpos verticales y cabezas esféricas dominan las tribunas.                                         | Todas las capturas frente a T1/T2.        | Las primeras filas muestran poses sentadas reconocibles, con muslos, brazos y variación de inclinación. La multitud lejana puede ser simple. No aumentar cantidad antes de corregir siluetas.                  |
| 5         | **Luz del estadio y sombras poco naturales.** La pista tiene sombras largas de mástiles muy marcadas y las gradas repiten un brillo homogéneo.     | Todas las capturas frente a T2.           | Sombras humanas anclan pies al piso; los mástiles no dominan el cuadro. Pista protagonista y gradación hacia público/techo conservan volumen. No exigir una iluminación cinematográfica más elaborada que TE4. |
| 6         | **Accesorios laterales fuera de escala aparente.** Las formas de pala grandes junto al cerramiento se ven como objetos flotantes, sin apoyo claro. | G01–G03, particularmente lateral derecho. | Si son decoración, deben leerse como cartel o exposición apoyada. Si son equipo, deben tener escala y soporte coherentes. No distraer de pelota/jugadores.                                                     |

El encuadre, la separación del marcador y la lectura de líneas/red ya son suficientes. Su rediseño no es requisito de esta mejora.

## Pruebas de movimiento y contacto para V4

Estos son criterios de revisión futura, no fallos observados en imágenes estáticas:

1. **Contacto:** observar derecha, revés/volea y remate. Preparación antes de llegada; pala alcanza el lugar donde cambia la velocidad de pelota; continuación después. Registrar cualquier salto o corrección brusca, sin aprobar por existencia de IK en código.
2. **Apoyos:** seguir arranque, frenado, cambio lateral y recuperación. Un pie de apoyo debe permanecer razonablemente estable mientras carga peso; evitar deslizamiento continuo o salto posterior al impacto.
3. **Golpes altos:** bandeja a altura y ritmo distintos de remate, con giro lateral y terminación cruzada. La selección textual no basta.
4. **Paredes:** permitir que una profunda pase detrás, seguir el vidrio, contactar después con espacio y recuperar. Observar una doble pared real sin contar vidrio como pique.
5. **Retorno del remate:** receptor mantiene turno y puede buscar alcance sobre la red sin invadir el suelo rival. Distinguir aprobación de regla por test y gesto por imagen.
6. **Táctica:** receptor y compañero cubren zonas diferentes; red/fondo varían por la pelota y posición rival. Acreditar una chiquita que produzca volea baja y un globo que desplace la pareja, sin deducir calidad sólo del nombre del golpe.
7. **Perfiles:** diferencias de altura, lateralidad y estilo deben coincidir con las fuentes que integre el agente principal. No certificar fidelidad por usar nombres reales.

## Evaluación final V4

### Observación realizada

Se abrió el juego local en pestaña propia y el visor `http://127.0.0.1:5188/work/poses/index.html`. El visor reproduce estados guardados del motor con los modelos y animaciones del producto. Se revisaron armado, contacto y terminación de bandeja, víbora, volea y remate; se inspeccionó también volea de Coello con izquierda y contactos desde ángulo contrario. Después de la recalibración física, se recargaron las 17 muestras nuevas y se repitieron bandeja, remate, víbora, remate zurdo y volea zurda. Las capturas con prefijo `final-` corresponden a esa última revisión.

Se abrieron los retratos locales FIP de Tapia, Coello, Galán y Chingotto, y las fotografías oficiales de camisetas de Galán y Chingotto. Proveniencia y límites de los dieciséis perfiles: [PLAYERS-V4.md](PLAYERS-V4.md). Este auditor no comparó visualmente las dieciséis caras ni todas las camisetas.

El visor permite examinar fases repetibles; las capturas no constituyen una medición continua de deslizamiento de pies, reacción humana o latencia. No se declara una animación comercial plenamente acreditada por la presencia de IK. El agente de física confirmó 37/37 pruebas; este auditor no duplicó su ejecución. Las ocho parejas fueron verificadas por el agente principal, no recorridas todas por este auditor.

### Defectos detectados y correcciones verificadas

- **Cabello de Galán dentro del cráneo:** aparecía calvo con un aro oscuro. Se comunicó la causa geométrica, se corrigió y se comprobó con recarga. La barba negra excesiva también se suavizó.
- **Armado alto anulado:** diez cuadros antes del contacto, bandeja y remate conservaban pala baja. El renderer confirmó que la pose de espera anulaba la preparación. Se corrigió y se verificó pala alta, codo preparado y base más amplia.
- **Terminación de bandeja vertical:** quedaba como un saludo junto a la cabeza. Después del ajuste, pala y brazo cruzan el pecho.
- **Marcador recortado al entrar:** en viewport CSS de aproximadamente 977 × 511, el menú requería desplazar para llegar al CTA y el partido conservaba ese scroll. Se corrigieron el diseño para poca altura y el retorno al inicio. Recarga y nuevo ingreso comprobaron CTA visible, `scrollY = 0` y marcador completo.

### Dictamen final por ítem

| Ítem                          | Dictamen                                                  | Alcance observado                                                                                                                                                                                                                                                            |
| ----------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Armado y contacto de golpes   | **APROBADO EN LAS FASES REVISADAS**                       | Ahora hay preparación alta anterior al impacto. En los contactos muestreados, pala y pelota coinciden visualmente. No se midió error espacial subcuadro.                                                                                                                     |
| Bandeja: altura y terminación | **APROBADO EN LAS FASES FINALES**                         | La nueva muestra de Galán muestra pelota a 1,93 m en el cuadro Contacto, cerca de la cabeza, sin el salto exagerado anterior. Prepara pala alta y termina cruzando el pecho. La cifra se leyó del visor; no es una medición sobre una foto.                                  |
| Remate / víbora / volea       | **APROBADO EN DIFERENCIACIÓN DE POSES**                   | Remate de Tapia a 2,28 m; remate zurdo de Coello a 3,02 m con salto y posterior retorno al suelo. Víbora de Chingotto a 1,92 m; volea zurda delante del cuerpo. Son alturas de pelota mostradas por el visor en cuadros Contacto. Las curvas siguen compartidas por familia. |
| Coello zurdo y perfiles       | **APROBADO EN IDENTIDAD BÁSICA**                          | Pala en mano izquierda de Coello; diferencias de ropa, pelo y proporciones visibles entre los cuatro iniciales. No se certifica parecido facial exacto.                                                                                                                      |
| Anatomía y caras contra TE4   | **NO ALCANZA TODAVÍA**                                    | Mejor continuidad de torso y brazos; las caras, cuello, manos y volúmenes de cuerpo siguen muy geométricos. TE4 T1/T2 conserva una apariencia humana menos estilizada.                                                                                                       |
| Ropa y palas                  | **APROBADO EN DIFERENCIACIÓN; MATERIAL NO ALCANZA TE4**   | Colores, nombres/marcas, cuello, patrones y palas propias permiten reconocer perfiles. El tejido y sus pliegues aún se ven uniformes frente a T2 y las fotos de kits.                                                                                                        |
| Público                       | **MEJORA VERIFICADA; NO ALCANZA TE4**                     | Ahora tiene brazos y piernas sentadas. Persiste mucha repetición de torso, cabeza y pose en filas cercanas. No hace falta aumentar cantidad.                                                                                                                                 |
| Cancha, luz y encuadre        | **APROBADO EN PRESENTACIÓN**                              | Pista y pelota se leen; sombras de postes menos dominantes. El juego mantiene cuatro jugadores completos. Las pequeñas cámaras del visor son para auditoría, no para evaluar la cámara de partido.                                                                           |
| Menú y marcador               | **APROBADO**                                              | Entrada al partido y pantalla pequeña comprobadas después de corregir scroll. A altura 511 px, la banda inferior tapa parte baja de la tarjeta lateral de saque; otro botón SACAR queda visible. Pendiente menor.                                                            |
| Pies y naturalidad continua   | **APROBADO EN APOYOS MUESTREADOS; CONTINUIDAD PENDIENTE** | Bandeja final conserva contacto con suelo; remate alto de Coello despega y vuelve. El apoyo de bandeja pasa por piernas muy cruzadas y el torso aún se ve rígido. No se acredita ausencia de patinamiento ni transferencia natural de peso con fases congeladas.             |
| Física y táctica              | **BASE FUNCIONAL APROBADA; SENSACIÓN HUMANA PENDIENTE**   | Recalibración congelada y 37 pruebas aprobadas comunicadas por física. Las muestras finales muestran alturas distintas para bandeja y remate. No sustituyen partidos humanos para juzgar reacción, tacto y decisiones de la pareja.                                          |
| Sonido                        | **SIN EVALUACIÓN AUDITIVA NUEVA**                         | No emitir dictamen perceptual sin escucha.                                                                                                                                                                                                                                   |

### Evidencia visual propia

Capturas reales del navegador guardadas en `outputs/visual-audit-v4`. Las que dicen `inicial` o `revision2` conservan estados intermedios y no deben presentarse como resultado final completo. Para comunicar los golpes finales, usar las siguientes:

- Bandeja definitiva: [armado](outputs/visual-audit-v4/final-bandeja-armado.jpg), [contacto](outputs/visual-audit-v4/final-bandeja-contacto.jpg), [terminación](outputs/visual-audit-v4/final-bandeja-terminacion.jpg).
- Remate definitivo: [armado](outputs/visual-audit-v4/final-remate-armado.jpg), [contacto](outputs/visual-audit-v4/final-remate-contacto.jpg), [terminación](outputs/visual-audit-v4/final-remate-terminacion.jpg).
- Coello: [remate alto con izquierda](outputs/visual-audit-v4/final-remate-zurdo-contacto.jpg), [aterrizaje y terminación](outputs/visual-audit-v4/final-remate-zurdo-terminacion.jpg), [volea zurda](outputs/visual-audit-v4/final-volea-zurdo-contacto.jpg).
- [Víbora de Chingotto](outputs/visual-audit-v4/final-vibora-contacto.jpg).

Evidencia de las correcciones intermedias y de interfaz:

- [Armado de bandeja corregido](outputs/visual-audit-v4/bandeja-armado-corregido.jpg).
- [Terminación de bandeja corregida](outputs/visual-audit-v4/bandeja-terminacion-revision2.jpg).
- [Armado de remate corregido](outputs/visual-audit-v4/remate-armado-corregido.jpg).
- [Contacto de volea, vista frontal](outputs/visual-audit-v4/volea-contacto-frontal-inicial.jpg).
- [Volea de Coello con izquierda](outputs/visual-audit-v4/volea-zurdo-contacto-inicial.jpg).
- [Menú en pantalla baja, corregido](outputs/visual-audit-v4/menu-viewport-chico-corregido.jpg).
- [Entrada al partido sin recorte superior](outputs/visual-audit-v4/partido-viewport-chico-corregido.jpg).

Un pendiente visual no se convierte en fallo físico sin evidencia; un test aprobado no se presenta como calidad visual acreditada. Los ítems insuficientes se registran para continuar con la entrega completa.

### Decisión y prioridades siguientes

**APROBADA esta iteración como mejora visible y funcional. No se aprueba paridad global con TE4.** La preparación, contacto, altura de bandeja, lateralidad, ropa por jugador y público sentado mejoraron de forma comprobable. Los defectos geométricos y de scroll encontrados durante esta revisión quedaron corregidos.

1. **Continuidad del movimiento:** observar rallies humanos y secuencias continuas; afinar frenado, transferencia de peso, piernas cruzadas y transición entre preparado/contacto/recuperación.
2. **Cuerpos y caras:** manos, cuello, hombros, contorno facial y piel. Las identidades básicas ya están conectadas; falta apariencia humana comparable con TE4 al acercarse.
3. **Materiales y público:** pliegues de ropa, variación de materiales y poses del público cercano. La multitud ya tiene miembros; aumentar cantidad no resuelve lo pendiente.
4. **Tacto e inteligencia de dobles:** contrastar asistencia, timing, errores y cobertura en partidos completos. Mantener pruebas físicas y añadir casos sólo ante defectos concretos.
5. **Sonido:** escucha real y mezcla antes de afirmar calidad; después muestras diferenciadas de pala, vidrio, malla, piso y zapatillas.

La nueva verificación de alturas cierra el pendiente de muestras físicas. Los pendientes de continuidad, fidelidad humana y escucha son límites de la evaluación y próximos pasos, sin bloquear la entrega completa de V4.

### Comprobación final de escala de pelota

Después del cierre anterior, se verificó una corrección acotada de pelota abriendo de nuevo juego y visor: radio visual de 0,033 m y ayuda de tamaño únicamente cuando su proyección resulta muy pequeña, según implementación comunicada por renderer. No cambió la revisión de poses.

**APROBADO en proporción y lectura estática.** En la volea cercana de Coello, la pelota ahora es claramente menor que la cara de la pala y guarda una proporción más natural. En transmisión conserva un punto amarillo sobre el azul; resulta discreto en el viewport de aproximadamente 977 × 511 usado por este auditor. Esta comprobación no mide seguimiento humano durante un rally completo.

Evidencia más reciente: [contacto cercano con escala final](outputs/visual-audit-v4/pelota-escala-final-contacto.jpg) y [transmisión después del saque](outputs/visual-audit-v4/pelota-escala-final-tv-rally.jpg). Las capturas de poses anteriores conservan la pelota ampliada previa: sirven para anatomía y fases, pero estas dos nuevas prevalecen al evaluar su tamaño.
