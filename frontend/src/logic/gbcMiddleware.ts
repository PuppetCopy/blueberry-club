import { BaseProvider } from '@ethersproject/providers'
import { GBC__factory, GBC } from 'contracts'




export function connect(provider: BaseProvider) {
  const contract = GBC__factory.connect('', provider)

  // contract.

  return { contract }
}