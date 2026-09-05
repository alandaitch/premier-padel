# Renderer V8 — estampados y bancos laterales

Estado de referencia: videos V7 de `outputs/revision-v7`, conservados sin cambios. Esta revisión modifica únicamente `game/renderer.ts` y `game/player-profiles.ts`; el director, las duraciones, el menú y las grabaciones los integra el agente principal.

## Qué cambia

### Estampados sobre la tela

Se inspeccionaron fotogramas de `camisetas.mp4` V7, además de las fotografías oficiales. Los nombres y marcas estaban resueltos con pequeños planos transparentes independientes del torso. El tejido no contenía esos estampados; el resultado perdía mucha legibilidad según la orientación del cuerpo.

Ahora la impresión forma parte de una textura de 1024 × 1024 sobre la malla de camiseta. Se corrigieron la dirección horizontal de las UV y su distribución vertical, conservando las normales exteriores. El frente se repite en ambos extremos de la costura UV; la espalda ocupa el centro. Los textos deforman con la camiseta durante el festejo. La prenda retirada usa la misma impresión de espalda, en lugar de planos flotantes con información distinta.

Las mangas usan texturas propias para que el estampado de pecho no aparezca duplicado en los brazos. Se incorporaron parches y ribetes observados. Las marcas son trazados tipográficos/vectoriales propios: no son archivos de logotipos oficiales ni reproducciones fotográficas exactas.

| Perfil | Referencia aplicada | Límite |
| --- | --- | --- |
| Tapia | NOX AT10 rojo: Qatar Airways delante y detrás, AGUSTÍN TAPIA, bandera argentina, NOX lumbar, NFA y Commvault en mangas. | Edición retail roja 2026, no uniforme universal por torneo. |
| Coello | Ropa On blanca y marca pequeña; pala HEAD conservada. | Retrato promocional On; no se atribuyen sponsors de un torneo específico. |
| Lebrón | Réplica Babolat negra/naranja, J. LEBRÓN, banderas de España y Andalucía, emblema de lobo y Babolat lumbar. | Interpretación vectorial de la réplica, sin sponsor externo inventado. |
| Augsburger | SIUX Fénix morada, PADELPOINT delante, Estithmar Holding detrás, LEO AUGSBURGER, detalles lima y KIA Renting. | Fénix es la línea de producto; dejó de figurar como patrocinador central. |
| Galán | Blanco/adidas, ale galán, bandera española, Reserve detrás, CUPRA en manga. | Fuente publicada en 2026 que enlaza una colección 2025; no se rotula como edición 2026. |
| Chingotto | Base de rayas diagonales y bloques asimétricos, NEURON en pecho y marca de manga FCH. | Interpretación de la réplica 26I; no se inventa sponsor central. |

Los otros perfiles mantienen aproximaciones anteriores. No se afirma exactitud de los dieciséis uniformes.

### Dos bancos sobre el mismo lateral

Los dos grupos de asientos están en el lateral derecho físico del estadio, con centros en **x = 13,85 m; z = −5,8 y +5,8 m**. El motor reserva hasta x = 13 m para recuperación exterior: por eso no se colocaron en x = 9 m, que seguía dentro de esa zona. Se separaron la primera fila derecha, las barandas y los carteles para dejar espacio.

Cada banco tiene tres plazas, respaldo blanco, almohadillas azules, toalla, mesa con botellas, bolso y ventilador. La disposición toma las fotografías proporcionadas por el usuario; no replica una marca de asiento o instalación concreta.

Las posiciones del banco se convierten al sistema relativo de los actores. Así, `endsSwapped` cambia qué equipo usa cada extremo sin trasladar los muebles al lateral izquierdo. Los recorridos atraviesan los huecos reales de puerta; hay carriles separados por jugador. Si un punto termina con alguien fuera del lateral contrario, el recorrido rodea un fondo antes de ir al banco.

El plano general de caminata/regreso incluye cancha y ambos bancos. El descanso usa un plano cercano. La cámara jugable permanece funcional y se restablece al terminar u omitir la presentación.

### Descanso completo

Durante el juego y las caminatas, los entrenadores permanecen sentados. En el descanso el entrenador del banco enfocado se levanta, avanza delante de sus jugadores, gira hacia ellos y gesticula. Vuelve al asiento al cerrar la escena.

Los jugadores se sientan, escuchan y alternan una bebida con la conversación. La botella está sujeta mediante el mismo objetivo de mano que usa la cadena del brazo; al beber, su boca se orienta hacia el punto de labios del rig. La botella desaparece de la mano al salir del descanso. La intensidad gestual existente de Lebrón se conserva como actuación ficticia.

La auditoría final reprodujo un residuo de botella al pasar directamente del banco a la espera, omitiendo el regreso. Se corrigió limpiando la visibilidad de ese accesorio al comenzar cada frame; únicamente la pose de banco lo habilita. La corrección vale para ambos circuitos y para cambios de perfiles. Las tomas anteriores se conservan para comparación.

La primera inspección detectó que el asiento, a 57,8 cm, tapaba los muslos. Se bajó la parte superior a aproximadamente **47,5 cm**, se adelantó la pelvis 14 cm y se recalcularon los pies sobre el suelo. La corrección final también redujo el cojín a **46 cm de profundidad**, con su centro 9,5 cm hacia el respaldo, y retranqueó el soporte. En el rig alto usado para comprobarlo, el centro de rodilla queda a unos 43,5 cm. Tras reiniciar el servidor de inspección —que conservaba módulos antiguos— se verificaron muslos continuos y apoyos. El auditor lo confirmó en los fotogramas 12 y 16 s del nuevo WebM; a los 23 s confirmó ambos bancos laterales y entrenadores sentados.

El director integra 8 s de caminata, 10 s de descanso y 8 s de regreso. El renderer recibe progreso por fase; no inventa puntos, cambia el marcador ni determina cuándo corresponde descansar.

### Circuito femenino

El contrato admite `gender`, peinados `ponytail`, `bun` y `braid`, y las prendas `cut` y `bottom`. Los ocho perfiles investigados viven en `game/women-roster.ts`; el renderer no altera su selección, mano dominante o capacidades físicas.

La rama femenina conserva la cadena articulada y los objetivos reales de contacto. Ajusta moderadamente hombros y cintura, sin caricaturizar el cuerpo. Las musculosas conservan el deltoides unido al brazo, con borde de sisa; las prendas con mangas mantienen sus estampados. La falda deportiva cubre un short interior y acompaña el giro de los muslos al correr y sentarse. Es una deformación de malla, no una simulación de tela.

Colas, rodetes y trenzas se construyen con curvas continuas de grosor variable, unidas al cuero cabelludo. Tienen oscilación leve asociada al paso. No son escaneos de las deportistas. Las facciones reciben ajustes discretos de mandíbula, nariz y cejas; los rostros todavía son estilizados.

Las ramas anteriores sólo se activan cuando el perfil las solicita. Los modelos masculinos conservaron su geometría para las grabaciones comparativas. El inspector `work/women-rig-review` permite ver ambas parejas, ropa, cabello, banco y bebida con estados explícitamente preparados.

## Fuentes inspeccionadas

- Fotografías de usuario: bancos en un mismo lateral; entrenador de pie ante jugadores sentados y bebida durante el descanso.
- [NOX Sponsors AT10 rojo](https://noxsport.com/collections/camisetas-sponsors-agustin-tapia-nox/products/camiseta-sponsors-at10-red): fotografía de espalda y lista oficial Qatar Airways, Commvault y NFA.
- [On incorpora a Arturo Coello](https://press.on-running.com/swiss-sportswear-brand-on-welcomes-padel-star-arturo-coello), 8 de enero de 2026, y [perfil On](https://www.on.com/es-us/explore/athletes/arturo-coello).
- [Babolat Réplica Lebrón 6MS26012](https://www.babolat.com/us/crew-neck-tee-replica-lebron-men/6MS26012.html?dwvar_6MS26012_COLOR_DESCRIPTION_ERP=2000): espalda negra/naranja inspeccionada.
- [SIUX Fénix X Leo Augsburger 26](https://www.siuxpadel.com/en/products/camiseta-siux-fenix-x-leo-augsburguer-26): fotografías oficiales frontal y posterior inspeccionadas por el auditor; el modelo de catálogo no se confundió con el jugador.
- [Adidas/Allforpadel, camiseta de Galán](https://allforpadel.com/en/blog/this-is-the-t-shirt-ale-galan-competes-in-n589).
- [Bullpadel Chingotto 26I](https://www.bullpadel.com/es/6568-camiseta-bullpadel-chingotto-26i-azul-atomico.html).

Las capturas de consulta quedan en `work/v8-recordings/kit-references`, fuera del producto.

## Validación y límites

- TypeScript y lint de los dos archivos pasan.
- Se comprobaron 32 recorridos combinando cambio de lado, extremos invertidos, cuatro jugadores y origen interior/exterior. Los 16 cruces interiores detectados atravesaron las puertas con margen para el cuerpo.
- Se proyectaron las cuatro esquinas de cancha y ambos bancos con la cámara general 1600 × 900; todos entran en cuadro.
- Inspección directa del renderer: ambos bancos visibles desde el plano general; entrenador sentado y luego de pie; agua en la mano; nombres y sponsors legibles en el tejido.
- Rama femenina: TypeScript y lint dirigidos pasan; inspección fresca de los ocho perfiles confirma musculosas o mangas, faldas o shorts, colas, rodetes y trenza, y pala izquierda de Josemaría y Ustero. En Triay/Brea se verificaron piernas continuas al sentarse y botella sujeta durante la bebida. La integración del circuito y las reproducciones reales las verifica el agente principal.
- Los fixtures son escenas preparadas, no una prueba de activación del descanso dentro de un partido. La integración y los videos V8 se verifican por separado.
- La tela y las personas siguen siendo procedurales. No hay simulación completa de tejido, interacción de dedos con botella, ni animaciones escaneadas. Esta revisión no declara equivalencia global con Virtua Tennis o TE4.

No se borró ni sobrescribió ningún `.mp4` o `.webm` V7. Las nuevas grabaciones deben guardarse como otra revisión o toma.
