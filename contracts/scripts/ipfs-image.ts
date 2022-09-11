

import { Resvg } from '@resvg/resvg-js'
import { attributeIndexToLabel, getLabItemTupleIndex, LabItemSale } from '@gambitdao/gbc-middleware'
import { NFTStorage, File } from 'nft.storage'
import { labItemSvg } from '../utils/image'
import { promises } from 'fs'
import { join } from 'path'



export async function storeImageOnIpfs(item: LabItemSale) {
  if (!process.env.NFT_STORAGE) {
    throw new Error('nft.storage api key is required')
  }

  const client = new NFTStorage({ token: process.env.NFT_STORAGE })

  const svg = labItemSvg(item.id)

  const resvg = new Resvg(svg)
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()

  console.info('Original SVG Size:', `${resvg.width} x ${resvg.height}`)
  console.info('Output PNG Size  :', `${pngData.width} x ${pngData.height}`)

  // await promises.writeFile(join(__dirname, './out.png'), pngBuffer)

  const index = getLabItemTupleIndex(item.id)

  const attributes = [
    {
      trait_type: attributeIndexToLabel[index],
      value: item.name
    },
    {
      trait_type: "Slot",
      value: index === 0 ? "Background" : index === 8 ? 'Special' : 'Wear'
    },
  ]

  const image = new File([pngBuffer], `lab-${item.name}.png`, { type: 'image/png' })

  console.log({
    id: item.id,
    name: item.name,
    description: item.description,
    image
  })

  return client.store({ name: item.name, description: item.description, image, attributes })
}

