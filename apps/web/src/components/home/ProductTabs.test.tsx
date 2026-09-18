import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ProductTabs } from './ProductTabs'

describe('ProductTabs', () => {
  it('mostra o primeiro grupo por omissão e troca ao clicar noutra aba', async () => {
    render(
      <ProductTabs
        grupos={[
          { chave: 'destaque', titulo: 'Em destaque', produtos: <p>Produto A</p> },
          { chave: 'ofertas', titulo: 'Ofertas', produtos: <p>Produto B</p> },
        ]}
      />,
    )
    expect(screen.getByText('Produto A')).toBeVisible()
    expect(screen.queryByText('Produto B')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Ofertas' }))
    expect(screen.getByText('Produto B')).toBeVisible()
    expect(screen.queryByText('Produto A')).not.toBeInTheDocument()
  })
})
