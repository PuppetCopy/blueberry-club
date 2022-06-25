

// import { Resvg } from '@resvg/resvg-js'
// import { LabItemSale } from '@gambitdao/gbc-middleware'



// export async function storeBery(id: LabItemSale) {
//   if (!process.env.NFT_STORAGE) {
//     throw new Error('nft.storage api key is required')
//   }

//   const client = new NFTStorage({ token: process.env.NFT_STORAGE })

//   const svg = labItemSvg(id.id)

//   const resvg = new Resvg(svg)
//   const pngData = resvg.render()
//   const pngBuffer = pngData.asPng()

//   console.info('Original SVG Size:', `${resvg.width} x ${resvg.height}`)
//   console.info('Output PNG Size  :', `${pngData.width} x ${pngData.height}`)

//   // await promises.writeFile(join(__dirname, './utext-out.png'), pngBuffer)

//   const imageFile = new File([pngBuffer], `lab-${id}.png`, { type: 'image/png' })
//   const metadata = await client.store({
//     name: id.name,
//     description: id.description,
//     image: imageFile
//   })

//   console.log(metadata)
// }

