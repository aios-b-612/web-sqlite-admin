import { describe, expect, it } from 'vitest'
import { filterAppMenuItemsByQuery } from './filterAppMenuItemsByQuery'

const apps = [
  { id: 'account', name: 'Minha conta' },
  { id: 'crm', name: 'CRM' },
  { id: 'agenda', name: 'Agenda' },
]

describe('filterAppMenuItemsByQuery', () => {
  it('devolve a lista inteira sem busca', () => {
    expect(filterAppMenuItemsByQuery(apps, '')).toEqual(apps)
    expect(filterAppMenuItemsByQuery(apps, '   ')).toEqual(apps)
  })

  it('filtra por nome sem diferenciar maiúsculas', () => {
    expect(filterAppMenuItemsByQuery(apps, 'crm')).toEqual([
      { id: 'crm', name: 'CRM' },
    ])
    expect(filterAppMenuItemsByQuery(apps, ' CONTA ')).toEqual([
      { id: 'account', name: 'Minha conta' },
    ])
  })

  it('devolve vazio quando nenhum app casa', () => {
    expect(filterAppMenuItemsByQuery(apps, 'xyz')).toEqual([])
  })
})
