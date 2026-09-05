# Render V5 — técnica, carga y presentación

Esta revisión mejora la estructura del remate, los apoyos, la puntería y la
continuidad con la física exterior. También cambia facciones, manos, indumentaria,
red, cerramientos, iluminación y público. Los personajes siguen siendo propios y
procedurales: no se presentan como escaneos ni animación capturada.

## Técnica aplicada

Se inspeccionó la imagen aportada por Alan, con cuatro momentos del remate.
La secuencia muestra preparación lateral, mano libre alta, codo flexionado,
extensión y transferencia hacia delante. Se contrastó con las fuentes de abajo.

El armado dejó de depender únicamente de rotaciones genéricas. Usa posiciones
explícitas de codo y mano, con segmentos anatómicos de longitud constante. La
cinemática inversa conserva el contacto que entrega la física.

| Fase             | Implementación                                                                    |
| ---------------- | --------------------------------------------------------------------------------- |
| Preparación      | Hombro no dominante hacia la red; cadera y tórax giran separados.                 |
| Carga            | Base más amplia, pie posterior retrasado y flexión de rodillas.                   |
| Armado de remate | Codo alto, antebrazo flexionado y pala detrás de la cabeza.                       |
| Mano libre       | Señala arriba durante la preparación y se recoge durante la extensión.            |
| Contacto         | Extensión hacia `contactPoint`; salto según la altura real del contacto.          |
| Terminación      | Pronación visual posterior al golpe y recorrido diagonal hacia la cadera opuesta. |
| Caída            | La pierna posterior pasa delante; rodillas y apoyo absorben la recuperación.      |

El giro lateral se mide respecto de la red. Antes se sumaba al ángulo de
persecución de la pelota, lo cual podía cancelar el perfil y dejar el cuerpo
frontal. La preparación de remate ahora representa un giro combinado de unos
76 grados en el modelo. Es una decisión de animación, no una medición biomecánica
extraída de un video.

La bandeja conserva pala alta y terminación sobre el lado opuesto. La víbora
tiene recorrido más lateral. Volea, derecha, revés y recogida baja reciben
preparaciones compactas y apoyos diferenciados. La volea mantiene la pala por
delante en su terminación. Las curvas todavía son compartidas por tipo de golpe.

## API y efectos

```ts
renderer.setChargePreview({
  active: true,
  progress: 0.75, // 0..1
  aim: 0.5, // -1..1 horizontal
  smash: true,
});
```

La flecha aparece sobre la cancha mientras se carga. En remate por tres indica
el costado de salida, siguiendo el significado de `aim` en física. La carga
prepara al jugador controlado; los rivales también pueden usar `Player.charging`
y `Player.charge`.

Los efectos dorados se disparan exclusivamente al recibir
`contactPoint.quality === 'perfect'`: dos anillos locales, iluminación breve,
estela dorada y desplazamiento de cámara menor a tres centímetros. El centro de
los anillos queda abierto para conservar la lectura de la pelota. No modifican
posición, velocidad, giro ni resultado del punto.

Se mantiene el radio visual real de pelota de 0,033 m. La ayuda lejana sólo
actúa por debajo de 2,8 píxeles CSS y llega como máximo a 1,8 veces. En vista
cercana se conserva escala 1.

## Cancha y salida exterior

Las dimensiones de las puertas se leen de `COURT`, compartido con física:
dos accesos por lateral, entre `|z| = 0,10` y `1,20` m, con altura libre de
2,20 m. Los postes y el dintel quedan fuera del espacio libre.

Cada zona exterior mide 4 × 8 m. Gradas, barandillas, bancos y silla arbitral
fueron desplazados fuera de esa zona. Su suelo tiene un tono más oscuro para
distinguirlo de la cancha. El render conserva la posición física de los jugadores;
el alcance adicional inclina el torso sin trasladar artificialmente los pies.
La cámara desplaza el encuadre y amplía suavemente el campo visual al salir.

La red tiene cinta plana de 6 cm: borde superior a 0,88 m en el centro y 0,92 m
en los extremos. La malla es de aproximadamente 45 mm. El cerramiento tiene
cuadrícula de 50 mm, cuya diagonal es de 70,7 mm. Se corrigió la altura del piso
visual para coincidir con el suelo de física.

## Personajes y estadio

- Pómulos, arco de cejas y mentón integrados en la superficie facial.
- Puente nasal, aletas, párpados, iris, pupila, labios y pliegue de oreja.
- Proporciones faciales distintas según perfil; cabeza menos ancha y cuello más fino.
- Brazos y mangas como superficies continuas, eliminando intersecciones visibles.
- Dedos diferenciados; mano dominante cerrada alrededor del grip.
- Piel con variación fina; ropa con tejido, pliegues y reflexión propia de tela.
- Tipografía y marcas de camisetas apoyadas en las referencias de `PLAYERS-V4.md`.
- Público con torso perfilado, pelo, manos y diferentes posturas sentadas.
- Menor luz ambiente y exposición para conservar volumen en piel y ropa.
- Banners de Qatar Airways, Wilson, Red Bull, Mondo y Bullpadel.
- Texto de banners legible desde ambos lados, corrigiendo el espejo del reverso.

## Fuentes y observación

- **Imagen de Alan:** secuencia de cuatro fases inspeccionada directamente.
- [The Padel School: pronación](https://thepadelschool.com/padel-tips/you-must-learn-pronation).
  Fundamenta la rotación del antebrazo durante el remate y conservar la empuñadura.
- [The Padel School: elección de remate](https://thepadelschool.com/padel-tips/which-smash-should-you-use).
  Diferencia remate, bandeja y víbora según situación y posición.
- [LTA: bandeja y remate](https://www.ltapadel.org.uk/play/padel-tips-and-techniques/overheads-bandeja-and-the-smash/).
  Preparación temprana, altura y extensión distintas entre ambos golpes.
- [PadelStar: preparación con explicación de Rafa Gálvez](https://padelstar.es/tecnica-padel/remate-potente-preparacion-perfecta/).
  Referencia escrita sobre codo flexionado, mano libre, piernas y orientación.
- [Víbora en cámara lenta, The Padel School](https://www.youtube.com/watch?v=PihyQF3EnHk).
  El auditor observó 0:47, 0:57, 1:12, 1:22, 1:32 y 1:42.
- [Bandeja, The Padel School](https://www.youtube.com/watch?v=DVQL4hUMnjw&t=63s).
  El auditor observó 1:03, 1:13, 1:23 y 1:33: perfil, contacto lateral y terminación.
- [Volea, LTA](https://www.youtube.com/watch?v=qS7_j8zfOFc&t=31s).
  El auditor observó 0:31 y 0:36: base, paso adelantado y terminación corta.
- [Reglas FIP 2026](https://www.padelfip.com/wp-content/uploads/2025/12/FIP_Rules-of-Padel-1.pdf).
  Dimensiones de red, cinta, malla, accesos y zonas de seguridad.
- [Premier Padel: Qatar Airways y socios oficiales](https://premierpadel.com/en/news/premier-padel-announces-multi-year-partnership-with-qatar-airways-2).
- [Premier Padel y Red Bull](https://premierpadel.com/en/news/premier-padel-announces-groundbreaking-strategic-partnership-with-red-bull).
- [Virtua Tennis 4: captura oficial de primer plano](https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/71390/ss_5d0aedf8f2271a7326d9a018fb23730d8f846fb6.1920x1080.jpg?t=1732637599).
  Comparador observado por el auditor, especialmente continuidad anatómica y materiales.

Las observaciones de videos corresponden al agente auditor. El agente de render
inspeccionó la imagen aportada, fuentes escritas, estados del visor y capturas.
No se atribuye una captura de movimiento inexistente a esos videos.

## Validación y límites

- Tipos y lint del renderer/perfiles verificados durante la integración.
- Seis pruebas geométricas de contacto conservan error menor a 0,025 m.
- Seis proyecciones conservan escala y límites de legibilidad de pelota.
- Dos pruebas del armado, diestro y zurdo: mano libre 0,29–0,31 m sobre el centro
  de cabeza; codo 0,19–0,20 m sobre hombro; pala situada detrás de la cabeza.
- El auditor aprobó extensión alta y terminación diagonal con recuperación de pierna.
- La posición lateral previa recibió una corrección adicional tras su devolución.
- Capturas y dictamen completo se conservan en `outputs/visual-audit-v5` y en el
  documento de revisión V5 del auditor.

**El primer plano humano todavía no alcanza Virtua Tennis 4.** Persisten facciones
estilizadas, transición cuello/hombro, ropa sin deformación esquelética continua
y movimientos compartidos. El orden de mejora recomendado es: malla humana
continua y texturas faciales, animaciones capturadas o medidas, deformación de
ropa y, después, más variedad del público. No se presenta esta revisión como
equivalencia global con ese juego.
