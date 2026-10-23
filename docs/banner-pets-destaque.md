# Pets com mais destaque no banner

Revisão de 2026-10-23 criada com image_gen integrado. Dois novos retratos independentes com transparência; layout, oferta e texto do banner preservados. Enquadramento próximo, rosto maior, contraste e iluminação mais vivos.

Ajuste de composição após revisão visual: `HeroPetBase` acrescenta uma borda creme sob as patas, para os retratos parecerem apoiados numa superfície. A borda é um componente em CSS, independente das imagens e ajustado ao desktop e ao celular. Conferido nas mesmas seis combinações de idioma e largura descritas abaixo.

Arquivos finais em apps/web/public/banner-hero-v2/: cao-destaque.webp e gato-destaque.webp. As versões anteriores continuam preservadas no mesmo diretório. Escala e posição de cada recorte em Hero.module.css; referências em HeroAnimals.tsx.

Validação: alpha preservado nos dois WebP, typecheck sem erros e conferência no navegador em 320, 390, 768 e 1440 px, incluindo português e alemão. Duas imagens carregadas, sem cortes de texto ou transbordamento no banner e sem erros de JavaScript. A página completa mantém o transbordamento anterior das abas de produtos em 320 px, fora do banner.

## cao-destaque

Prompt final:

~~~text
Use case: ads-marketing
Asset type: transparent photographic dog cutout, an independent foreground layer in the existing Animora homepage hero.
Primary request: a lively golden retriever puppy leaning toward the camera, broad fluffy honey-gold head, soft floppy ears, warm brown eyes with crisp studio catchlights, natural happy open-mouth smile with a little pink tongue, wearing a plain saturated deep teal cotton bandana. Both fluffy front paws rest in front of its chest on an invisible low ledge. Head, upper chest, bandana and both forepaws only; compact broad silhouette with NO long legs, haunches or tail. Not a full-body sitting dog.
Composition/framing: square canvas, strong intimate close-up at puppy eye level, head occupies about 55% of image height and upper body fills most of the width. Both ears and front paws fully visible with small transparent margins. Puppy faces camera, slight endearing head tilt. A confident cheerful expression with photographic presence, not a timid distant pose.
Style/medium: superb high-end commercial pet photography, beautifully separated real fur strands, realistic anatomy, tack-sharp face and nose, rich honey gold and cream fur, strong clean natural midtone contrast. Bright warm studio key light with a clear soft rim light defining fur edges against dark teal backgrounds, open luminous shadows, very crisp and dimensional without looking overprocessed or plastic. The photograph should remain striking when displayed only 300px tall.
Constraints: genuinely transparent alpha background; no floor, ledge, backdrop or background rectangle rendered; no shadows outside the animal; no lettering, logo or watermark; no other animals, no humans, no toys; no dull flat light, no washed-out grey fur, no cartoon, no human-like smile, no oversized eyes, no cropped ear tips, no cropped paws.
Intended palette: orange #ED6900, deep teal #085B6B, warm cream #FDF3EC. This is a standalone subject photo only; website layout, lettering, sale badge and graphic shapes are implemented separately in code.
~~~

## gato-destaque

Prompt final:

~~~text
Use case: ads-marketing
Asset type: independent transparent photographic cat cutout for an orange, teal and cream pet-store hero banner.
Primary request: a beautiful fluffy white and pale silver young adult cat photographed in a close portrait, luminous creamy white cheeks and chest, subtle pale silver accents only on ear edges and forehead, natural vivid emerald-green eyes with clear photographic catchlights, pink nose, thick soft fur. Cat looking directly into the camera with an alert cheerful curious expression, one front paw raised beside its chest as if greeting or playfully reaching, the other front paw resting forward on an invisible low ledge.
Composition/framing: square canvas, compact head-and-upper-chest portrait with both front paws, no lower body, no long legs, no tail or haunches. Large expressive face takes up at least 55% of frame height. Whole ears, cheek fur and raised paw comfortably inside frame with small transparent margins. Straight-on eye-level portrait. It will sit beside a cheerful close-up golden retriever with a teal bandana on a deep teal graphic background. Strong foreground photographic presence at a rendered size around 250px.
Style/medium: superb premium commercial pet photography, extremely clear dimensional fur texture and whiskers, bright warm studio key and subtle rim lighting to separate white fur from teal, rich clean contrast and luminous highlights with detail preserved, natural face proportions, realistic anatomy, crisp nose and irises. The result should look energetic, soft and tactile, not grey, flat, distant or faded.
Constraints: actual transparent alpha background. No floor, ledge, background, cast shadows outside subject, lettering, logo or watermark. One cat only. No clothes, collar, props, humans or other animals. No oversized cartoon eyes, no plastic fur, no dull grey shadows, no cropped ears, no extra paws. Website text, offer and background remain separate code components.
~~~
