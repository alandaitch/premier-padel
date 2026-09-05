# Render y animación V4

La revisión incorpora perfiles reales, siluetas distintas y golpes articulados.
La escena conserva la cámara y las dimensiones de cancha ya verificadas.
El resultado sigue siendo un modelo procedural; no usa captura de movimiento.

## Jugadores y materiales

- `PadelRenderer` acepta `options.players` y expone `setPlayers(profiles)`.
- Cada perfil define altura, complexión, mano hábil, pelo, barba, ropa y pala.
- Coello usa la izquierda. Chingotto conserva una silueta más baja y compacta.
- Cadera y hombros giran por separado. Brazos y piernas tienen articulaciones independientes.
- El torso usa una superficie anatómica continua, con pecho, cintura y hombros.
- Remeras incluyen tejido, costuras, pliegues, patrones y textos del perfil.
- Las palas tienen formas diferenciadas, perforaciones reales, grip y correa.
- La escala corporal cambia con la altura. La pala mantiene su tamaño aproximado.
- Pelo y barba siguen los retratos de referencia, sin bandas genéricas.

Los retratos oficiales y las referencias de indumentaria están en
`work/references/`. Sus fuentes y las decisiones del catálogo corresponden al
documento de jugadores. Son referencias visuales; no texturas faciales aplicadas
directamente al modelo.

## Preparación, contacto y recuperación

La animación combina poses por golpe con cinemática inversa de dos segmentos.
`contactPoint` proviene de la simulación. El render orienta la pala hacia ese
contacto sin desplazar la pelota.

| Situación           | Comportamiento visual                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Espera              | Rodillas flexionadas, pala por delante y mano libre próxima.          |
| Derecha y revés     | Giro opuesto de hombros, armado corto y terminación diferenciada.     |
| Volea               | Pala adelantada y recorrido compacto.                                 |
| Bandeja             | Armado alto, codo preparado y terminación cruzada sobre el pecho.     |
| Víbora              | Armado lateral y recorrido más horizontal que la bandeja.             |
| Remate              | Carga, extensión al contacto, salto según altura y caída con flexión. |
| Globo y contrapared | Recorrido ascendente desde una posición baja.                         |
| Chiquita y dejada   | Gesto corto, con menor amplitud.                                      |
| Defensa de pared    | Giro corporal hacia la pelota y pasos más cortos.                     |
| Saque               | Preparación baja y gesto de abajo, vinculado al estado de servicio.   |

La orientación de la cara usa la dirección de salida. El brazo resuelve hombro,
codo y muñeca; la pala puede cruzar la red durante una devolución permitida.
El cuerpo conserva su lado de la cancha.

Las piernas resuelven apoyo sobre el suelo. Durante la fase de apoyo, los pies
mantienen una posición del mundo. Durante el paso, avanzan con elevación moderada.
Esta solución reduce el deslizamiento; no representa fuerzas articulares reales.

La costura de la pelota gira usando `wx`, `wy` y `wz` de física. Los pulsos de
bote y pared siguen `lastBounce`. No se agregan rebotes ni trayectorias visuales
independientes.

La geometría de pelota tiene radio de 0,033 m: diámetro real de 6,6 cm.
La costura y el centro del bote respetan ese tamaño. En cámara cercana, la escala
es 1. En TV y cenital, sólo aumenta cuando su diámetro proyectado resulta menor
de 2,8 píxeles CSS. La ayuda busca ese diámetro, con un máximo de 1,8 veces.
Se calcula usando la cámara efectiva de cada render, también en el visor de poses.
Esta ayuda de legibilidad no modifica tamaño, centro ni contactos de la física.

## Fuentes primarias usadas

- [LTA: bandeja y remate](https://www.ltapadel.org.uk/play/padel-tips-and-techniques/overheads-bandeja-and-the-smash/).
  Preparación lateral temprana, pala alta, bandeja alrededor de la altura de ojos
  y terminación cruzada. Fundamenta separar bandeja de remate.
- [Fotografía de preparación alta de LTA](https://www.ltapadel.org.uk/globalassets/padel-play/adults/padel-player-overhead.jpg).
  Inspeccionada visualmente: codo cargado, mano libre orientada y base amplia.
- [LTA: derechas y reveses](https://www.ltapadel.org.uk/play/padel-tips-and-techniques/forehands-and-backhands/).
  Preparación corta, giro de hombros y contacto adelantado.
- [LTA: voleas](https://www.ltapadel.org.uk/play/padel-tips-and-techniques/volleys/).
  Posición preparada por delante y recorrido compacto.
- [UK Padel: explicación de la víbora por su entrenador](https://ukpadel.org/coaches-corner-unleash-the-vibora/).
  Apoya la diferencia entre recorrido lateral de víbora y bandeja cortada.
- [Captura oficial de Tennis Elbow 4](https://static.managames.com/Images/TennisElbow4/TE4_ss03.jpg).
  Referencia de legibilidad, proporciones, texturas y densidad del estadio.

La colección de videos de LTA también se consultó como índice. No se atribuye
esta implementación a un análisis cuadro por cuadro de esos videos.

## Validación realizada

- `npx tsc --noEmit --pretty false`: correcto.
- `git diff --check`: correcto.
- Tamaño de pelota: seis proyecciones verificadas. TV cercana: 3,10 píxeles,
  escala 1. TV lejana: 2,80 píxeles, escala 1,72. Visor cercano: escala 1.
  En formato vertical lejano llega a 2,02 píxeles por el límite de 1,8 veces.
  La ayuda no garantiza 2,8 píxeles en todas las distancias.
- El auditor confirmó la proporción pelota/pala en contacto cercano y el contraste
  amarillo sobre azul en TV. Esta aprobación cubre capturas estáticas; queda
  pendiente una prueba humana de seguimiento durante peloteos rápidos.
- Prueba geométrica de seis poses: derecha, revés, volea zurda, remate, espera
  y recogida baja. El centro de pala quedó sobre el objetivo, con error menor
  a 0,025 m en todas. El error registrado redondeado a cinco decimales fue cero.
  Las orientaciones resultaron finitas. Esta prueba aislada no valida cada
  trayectoria posible durante un partido.
- El auditor revisó las fases del harness `work/poses/`, generado desde estados
  de la simulación. Es una vista de análisis con cámara cercana y tiempo detenido.
  No equivale a una grabación continua de gameplay.
- La revisión confirmó contacto visible y uso de la mano izquierda en Coello.
- Se corrigió pelo enterrado en la cabeza y barba excesivamente voluminosa.
- Se corrigió la terminación de bandeja: ahora cruza el pecho.
- Se corrigió un fallback de espera que bajaba la pala durante globos altos.
  El auditor confirmó armado alto de bandeja y remate después del ajuste.

Evidencia local de las últimas correcciones:

- `outputs/visual-audit-v4/bandeja-armado-corregido.jpg`
- `outputs/visual-audit-v4/remate-armado-corregido.jpg`
- `outputs/visual-audit-v4/bandeja-terminacion-revision2.jpg`
- `outputs/visual-audit-v4/volea-zurdo-contacto-inicial.jpg`
- `outputs/visual-audit-v4/pelota-escala-final-contacto.jpg`
- `outputs/visual-audit-v4/pelota-escala-final-tv-rally.jpg`

## Límites y orden de mejora

1. Sustituir gradualmente las curvas procedurales por animaciones esqueléticas
   medidas. El contacto funciona, pero algunas transiciones siguen siendo rígidas.
2. Mejorar escultura facial, manos y continuidad de articulaciones. Las identidades
   se distinguen por perfil y silueta; los rostros todavía son estilizados.
3. Afinar transferencia de peso y frenadas durante desplazamientos diagonales.
   El apoyo actual reduce patinaje, pero no simula equilibrio corporal completo.
4. Refinar público y ropa en planos cercanos. El público continúa siendo simple,
   aunque ahora incluye muslos y antebrazos en postura sentada.

La revisión visual aprobó las correcciones concretas indicadas. Esto no constituye
una aprobación global de equivalencia con Tennis Elbow 4.
