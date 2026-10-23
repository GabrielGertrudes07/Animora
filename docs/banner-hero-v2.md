# Banner principal v2

Revisão atual dos animais: [Pets com mais destaque](banner-pets-destaque.md). O banner usa agora `cao-destaque.webp` e `gato-destaque.webp`; os recortes iniciais abaixo ficam preservados como histórico.

Criado em 2026-10-23 com image_gen integrado. Cão e gato gerados individualmente com fundo transparente; WebP preserva alpha. Arquivos finais em apps/web/public/banner-hero-v2/.

Hero.tsx compõe HeroPromoBar, HeroCopy, HeroOffer, HeroAnimals, HeroDecorations e HeroPetBase. Estilos responsivos em hero/Hero.module.css. Texto e oferta usam next-intl; fundo e decoração são CSS/SVG. Fontes herdadas do layout.

Componentes em `apps/web/src/components/marketing/hero/`:

- `HeroPromoBar.tsx`: faixa promocional e ícone.
- `HeroCopy.tsx`: data, título, subtítulo e link para o catálogo.
- `HeroOffer.tsx`: selo com valor e texto da oferta.
- `HeroAnimals.tsx`: duas imagens independentes, com posição e tamanho próprios.
- `HeroDecorations.tsx`: fundo teal, contorno aqua, sombra e detalhes vetoriais.
- `HeroPetBase.tsx`: borda de apoio sob as patas, dando contexto ao corte dos retratos.

Validação: typecheck sem erros e 169 testes existentes aprovados. Playwright em 320, 390, 768 e 1440 px, incluindo português e alemão: um único h1, duas imagens carregadas, CTA localizado, sem erro de JavaScript ou transbordamento no banner. A página completa ainda tem transbordamento em 320 px nas abas de produtos, fora do banner.

## cao

Arquivo: apps/web/public/banner-hero-v2/cao.webp

Prompt final:

~~~text
Use case: ads-marketing
Asset type: a single isolated transparent-background dog cutout layer for the redesigned Animora pet-store website hero.
Primary request: a joyful realistic young golden retriever with honey-gold fur and fluffy ears, wearing a simple deep teal triangular cotton bandana, sitting upright in a slightly three-quarter pose facing left while looking directly into camera, mouth gently open with a little pink tongue, happy affectionate expression, slight curious head tilt.
Composition/framing: one complete single dog, from ear tips to front paws and haunches, all inside the image with a small clear margin, centered, vertical subject in square canvas. Forepaws close together, natural anatomically correct sitting posture. The dog must read beautifully as a separate editorial cutout layered over a teal circular shape.
Style/medium: high-end photorealistic pet commercial photography, fine real fur, natural eyes and nose, soft warm studio light from upper left and gentle fill, realistic body proportions, same approachable polished photography as a premium playful pet shop with orange #ED6900, teal #085B6B and cream #FDF3EC identity.
Constraints: genuinely transparent background with clean alpha, do not draw any floor, background, rectangle or shadow outside the subject. No props, no rope toy, no collar, no humans, no second animal, no text, no logos, no watermark, no extra paws, do not crop ears or paws.
~~~

## gato

Arquivo: apps/web/public/banner-hero-v2/gato.webp

Prompt final:

~~~text
Use case: ads-marketing
Asset type: single isolated transparent-background cat cutout layer for Animora pet-store website hero.
Primary request: a charming fluffy silver-grey and white young adult cat, white muzzle, white chest and white front paws, soft light grey tabby markings, green eyes and pink nose; sitting upright in a natural three-quarter pose facing slightly left while looking curiously at the camera, front paws resting together on an invisible floor. Tail curls neatly next to its body on the right. A calm inquisitive expression, head held slightly upward.
Composition/framing: the complete single cat including both ears, body, front paws, haunches and curled tail, comfortably within the square image with a small margin. Center the isolated animal. It will be placed as an independent foreground layer in front of and slightly right of a golden retriever in a responsive website hero.
Style/medium: premium photorealistic pet advertising photography, richly detailed natural fur, bright lifelike eyes, soft warm studio key light from upper left, subtle fill, natural correct cat anatomy, polished friendly commercial quality consistent with orange #ED6900, teal #085B6B and cream #FDF3EC pet-store branding.
Constraints: genuinely transparent background and clean alpha around fur and whiskers. No studio backdrop, no floor or cast shadow outside animal, no clothing, no collars, no toys, no other animals, no humans, no text, no logo, no watermark, no cropped paws or ears, no extra limbs.
~~~
