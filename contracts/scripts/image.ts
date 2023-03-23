

import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import { attributeIndexToLabel, berrySvg, getLabItemTupleIndex, IBerryDisplayTupleMap, LabItemSale } from '@gambitdao/gbc-middleware'
import { NFTStorage, File } from 'nft.storage'
import { labItemSvg } from '../utils/image'
import { promises } from 'fs'
import { join } from 'path'
import { map, runEffects } from "@most/core"
import { newDefaultScheduler, } from "@most/scheduler"




export async function storeLabImageOnIpfs(item: LabItemSale) {
  if (!process.env.NFT_STORAGE) {
    throw new Error('nft.storage api key is required')
  }

  const client = new NFTStorage({ token: process.env.NFT_STORAGE })
  const svg = await labItemSvg(item.id)

  const resvg = new Resvg(svg)
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()

  console.info('Original SVG Size:', `${resvg.width} x ${resvg.height}`)
  console.info('Output PNG Size  :', `${pngData.width} x ${pngData.height}`)

  await promises.writeFile(join(__dirname, `../.dist/${item.name}.png`), pngBuffer)

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


const scheduler = newDefaultScheduler()

export async function storeGBCImage(tuple: IBerryDisplayTupleMap): Promise<sharp.Sharp> {
  if (!process.env.NFT_STORAGE) {
    throw new Error('nft.storage api key is required')
  }

  const svg = berrySvg(tuple)

  return new Promise(resolve => {
    const streamImg = map(async (svgstr) => {
      const resvg = Buffer.from(svgstr)
      const www = sharp(resvg)
        .toFormat('webp')


      return resolve(www)
    }, svg)

    runEffects(streamImg, scheduler)
  })

  // return new Promise(resolve => {

  //   const streamImg = map(async (svgstr) => {
  //     const resvg = new Resvg(svgstr)
  //     const pngData = resvg.render()
  //     const pngBuffer = pngData.asPng()

  //     return resolve(pngBuffer)
  //   }, svg)

  //   runEffects(streamImg, scheduler)
  // })
}

