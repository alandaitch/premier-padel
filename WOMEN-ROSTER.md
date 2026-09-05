# Plantel femenino 2026

Estado de referencia: 5 de septiembre de 2026. Este módulo es un recorte de cuatro parejas, no un padrón histórico.

## Contrato

- `WOMEN_TEAMS` conserva el shape de `TEAMS`: `name`, dos `players`, `countries`, `style`, `color`.
- Cada nombre de `players` coincide exactamente con un `WOMEN_PROFILES[*].name`.
- Los ocho perfiles declaran `gender: 'female'`.
- El renderer puede leer `ponytail`, `bun` y `braid`.
- La indumentaria admite `kit.cut` y `kit.bottom`.
- Todos los `sponsor` están vacíos. Las fotos no prueban un estampado estable.
- La física, IA, velocidad y potencia vienen del mismo `PadelMatch`.
- El género sólo cambia catálogo y representación visual.

## Parejas verificadas

Premier Padel publicó el cuadro de octavos de Madrid P1 el 3 de septiembre de 2026. Allí figuran las cuatro primeras parejas seleccionadas:

1. Gemma Triay / Delfina Brea, cabeza de serie 1.
2. Paula Josemaría / Bea González, cabeza de serie 2.
3. Ari Sánchez / Andrea Ustero, cabeza de serie 3.
4. Claudia Fernández / Martina Calvo, cabeza de serie 4.

Fuente primaria: [Premier Padel, Madrid P1](https://premierpadel.com/en/news/libaak-alfonso-logran-una-victoria-memorable-ante-el-campen-de-2025-mientras-las-favoritas-cumplen-con-su-papel-en-madrid). Consultada el 5 de septiembre de 2026.

La nota oficial FIP de Londres confirma además a Fernández / Calvo. Incluye una foto reciente de ambas con indumentaria azul marino.

Fuente primaria: [FIP, campeonas de London P1](https://www.padelfip.com/es/2026/08/fernandez-calvo-hacen-historia-martina-se-convierte-en-la-campeona-mas-joven-de-siempre-regresan-coello-tapia/). Consultada el 5 de septiembre de 2026.

Las parejas cambian durante la temporada. Este archivo debe revisarse al actualizar el cuadro.

## Alturas y lado de juego

Las fichas FIP muestran altura y posición de pista. La posición significa izquierda o derecha de la cancha.

| Perfil | Altura | Lado | Fuente primaria |
| --- | ---: | --- | --- |
| Gemma Triay | 1,73 m | Izquierda | [FIP](https://www.padelfip.com/player/gemma-triay-pons/) |
| Delfi Brea | 1,70 m | Derecha | [FIP](https://www.padelfip.com/player/delfina-brea-senesi/) |
| Paula Josemaría | 1,60 m | Derecha | [FIP](https://www.padelfip.com/player/paula-josemaria-martin/) |
| Bea González | 1,74 m | Izquierda | [FIP](https://www.padelfip.com/player/beatriz-gonzalez-fernandez/) |
| Ari Sánchez | 1,65 m | Izquierda | [FIP](https://www.padelfip.com/player/ariana-sanchez-fallada/) |
| Andrea Ustero | 1,70 m | Derecha | [FIP](https://www.padelfip.com/player/andrea-ustero-prieto/) |
| Claudia Fernández | 1,64 m | Derecha | [FIP](https://www.padelfip.com/player/claudia-fernandez-sanchez/) |
| Martina Calvo | 1,66 m | Izquierda | [FIP](https://www.padelfip.com/player/martina-calvo-santamaria/) |

Consultadas el 5 de septiembre de 2026. FIP rotula valores como `1.73 CM`; el juego los interpreta como metros.

HEAD identifica expresamente a Paula Josemaría y Andrea Ustero como zurdas. Las demás manos se interpretaron desde imágenes oficiales de acción.

- [HEAD, Paula Josemaría](https://www.head.com/es_ES/athletes/padel/paula-josemaria-martin)
- [HEAD, Andrea Ustero](https://www.head.com/es_ES/rs/stories/andrea-ustero-born-to-dominate-the-court)

Consultadas el 5 de septiembre de 2026.

## Equipación y palas

La paleta Bullpadel usa colores oficiales de su colección 2026:

- Gemma: rosa sombra. Pala Elite 2026 híbrida.
- Delfi: jade. Pala Vertex 05 W 2026 diamante.
- Bea: ciruela. Pala Pearl 2026 diamante.
- Claudia: azul marino. Pala Wonder 2026 híbrida.

Fuentes oficiales:

- [Bullpadel, camisetas de jugadoras](https://www.bullpadel.com/es/46-camisetas-jugadoras)
- [Bullpadel Elite W 26, Gemma](https://www.bullpadel.com/gb/5688-racket-bullpadel-elite-w-26.html)
- [Bullpadel Vertex 05 W 26, Delfi](https://www.bullpadel.com/es/5681-pala-bullpadel-vertex-05-w-26.html)
- [Bullpadel Pearl 26, Bea](https://www.bullpadel.com/gb/5625-bullpadel-racket-pearl-26.html)
- [Bullpadel Wonder 2026, Claudia](https://www.bullpadel.com/es/5689-pala-bullpadel-wonder.html)

HEAD confirma equipación completa y pala Extreme Motion para Paula. También confirma equipación completa, pala Gravity Motion blanca/menta y mano izquierda para Andrea.

- [HEAD, Paula Josemaría](https://www.head.com/es_ES/athletes/padel/paula-josemaria-martin)
- [HEAD, Andrea Ustero](https://www.head.com/es_ES/rs/stories/andrea-ustero-born-to-dominate-the-court)

La tienda oficial licenciada de adidas confirma a Ari y su Arrow Hit Light 2026.

- [adidas Padel, Ari Sánchez](https://allforpadel.com/en/blog/ari-sanchez-conquers-valencia-after-delivering-a-top-level-tournament-n618)

La foto oficial de Londres permite observar el conjunto marino de Martina. OYSHO es visible en la prenda. La pala se representa como Babolat, observada en juego; su modelo exacto no se afirma.

Todas las fuentes de esta sección se consultaron el 5 de septiembre de 2026.

## Límites visuales

Los modelos son aproximaciones estilizadas. No afirman semejanza facial ni biometría exacta.

Los tonos de piel y cabello se estimaron visualmente. También se aproximaron peinados y cortes.

Los códigos hexadecimales traducen fotos y nombres comerciales. No son muestras colorimétricas oficiales.

Las camisetas usan patrón plano. Los nombres de marca y CUPRA/ALPINE se imprimen sobre la tela; no son réplicas exactas de logos ni de todos los estampados comerciales.

`build` sólo guía proporciones visuales. No modifica atributos deportivos ni física.

La revisión visual final de la foto FIP confirmó falda marina para Calvo. También verificó CUPRA centrado en su frente y ALPINE en Fernández; ambos se agregaron como texto y las espaldas desconocidas se mantienen sin sponsor.
