// Serve a loja e o painel no domínio real, a partir da tua máquina.
//
// Não instala nada e não toca na VPS: encaminha por nome de domínio para as
// portas onde o `pnpm dev` já está a correr.
//
//   shop.zentoo.com.br    → loja    (3001)
//   admin.zentoo.com.br   → painel  (3000)
//
// Precisa de duas linhas no /etc/hosts a apontar esses nomes para 127.0.0.1,
// e de correr com privilégios, porque a porta 80 é reservada:
//
//   sudo node scripts/dominio-local.mjs
//
// ponytail: só HTTP, sem certificado. Para ver o resultado no domínio chega;
// se um dia precisares de HTTPS local (cookies `Secure`, testar pagamentos),
// o caminho é `mkcert` mais um `https.createServer` com o par de chaves.

import http from 'node:http'

const DESTINOS = {
  'shop.zentoo.com.br': 3001,
  'admin.zentoo.com.br': 3000,
}

const PORTA = Number(process.env.PORTA ?? 80)

const servidor = http.createServer((pedido, resposta) => {
  const dominio = (pedido.headers.host ?? '').split(':')[0]
  const porta = DESTINOS[dominio]

  if (!porta) {
    resposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    resposta.end(
      `Domínio "${dominio}" não está mapeado.\n\n` +
        `Conhecidos:\n${Object.keys(DESTINOS).map((d) => `  ${d}`).join('\n')}\n`,
    )
    return
  }

  const encaminhado = http.request(
    {
      host: '127.0.0.1',
      port: porta,
      method: pedido.method,
      path: pedido.url,
      // O host original segue à frente: o Next usa-o para montar URLs absolutos
      // (imagens, og:url), e sem isto a loja anunciava-se como localhost.
      headers: { ...pedido.headers, 'x-forwarded-host': dominio, 'x-forwarded-proto': 'http' },
    },
    (recebido) => {
      resposta.writeHead(recebido.statusCode ?? 502, recebido.headers)
      recebido.pipe(resposta)
    },
  )

  encaminhado.on('error', (erro) => {
    resposta.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
    resposta.end(
      `Não consegui falar com o serviço na porta ${porta}.\n\n` +
        `Arranca-o primeiro:\n` +
        `  pnpm --filter @animora/${porta === 3001 ? 'web' : 'api'} dev\n\n` +
        `Detalhe: ${erro.message}\n`,
    )
  })

  pedido.pipe(encaminhado)
})

servidor.listen(PORTA, () => {
  console.log(`proxy na porta ${PORTA}:`)
  for (const [dominio, porta] of Object.entries(DESTINOS)) {
    console.log(`  http://${dominio}  →  127.0.0.1:${porta}`)
  }
})
