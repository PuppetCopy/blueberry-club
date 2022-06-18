import { saleDescriptionList } from "@gambitdao/gbc-middleware"
import { task } from "hardhat/config"
import { NFTStorage, File } from 'nft.storage'
import { labItemSvg } from '../utils/image'
import dotenv from "dotenv"
import { Resvg } from "@resvg/resvg-js"
dotenv.config({ path: '../.env' })

export default task("publish-items", async () => {
  for (const config of saleDescriptionList) {
    if (!process.env.NFT_STORAGE) {
      throw new Error('nft.storage api key is required')
    }

    const client = new NFTStorage({ token: process.env.NFT_STORAGE })
    const svg = labItemSvg(config.id)

    const resvg = new Resvg(svg)
    const pngData = resvg.render()
    const pngBuffer = pngData.asPng()

    console.info('Original SVG Size:', `${resvg.width} x ${resvg.height}`)
    console.info('Output PNG Size  :', `${pngData.width} x ${pngData.height}`)

    const image = new File([pngBuffer], `lab-${config.id}.png`, { type: 'image/png' })


    const attributes = config.attributes
    const metadata = await client.store({ name: config.name, description: config.description, image, attributes })

  }

})



