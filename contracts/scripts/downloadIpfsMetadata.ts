import { IAttributeMappings, IBerryDisplayTupleMap } from '@gambitdao/gbc-middleware'
import fs from 'fs'
import { storeGBCImage } from './image'
import { join } from 'path'

interface nftMetdata {
  attributes: Array<{
    trait_type: string;
    value: string;
  }>
}

const delay = (time: number): Promise<number> => new Promise(resolve => setTimeout(() => resolve(time), time));

async function downloadAll() {

  // create directory for metadata files
  const directory = './ipfs'
  const imageDir = directory + '/images'
  const metadataDir = directory + '/metadata'
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory)
  }
  // get total supply of tokens
  const totalSupply = 10000

  // loop through all token IDs and download metadata files
  for (let i = 0; i < totalSupply; i++) {
    const tokenId = i + 1
    const queryMetdataFile = fs.promises.readFile(metadataDir + `/${tokenId}.json`, 'utf8').then(data => JSON.parse(data) as nftMetdata)

    const metadata = await queryMetdataFile.catch(async () => {
      const md: nftMetdata = await fetch(`https://ipfs.io/ipfs/QmZfVGMtQPeSfre5yHDzDdw4ocZ1WEakGtbYqvtvhhD4zQ/${tokenId}`).then(async res => res.json())
      const filename = `${metadataDir}/${tokenId}.json`

      await fs.promises.writeFile(filename, JSON.stringify(md))
      console.log(filename)
      await delay(3000)

      return md
    })



    const tuple = metadata.attributes.map((md): any => {
      // @ts-ignore
      const newLocal = IAttributeMappings[md.value]
      return newLocal
    }) as IBerryDisplayTupleMap

    try {
      (await fs.promises.readFile(imageDir + `/${tokenId}.png`))
    } catch (err) {
      const imgBuffer = await storeGBCImage(tuple)
      const filename = `${imageDir}/${tokenId}.png`
      await fs.promises.writeFile(filename, imgBuffer)

      console.log(filename)
    }

  }
}

function downloadRecur() {
  downloadAll()
    .catch(async () => {
      await delay(20000)
      downloadRecur()
    })
}


downloadRecur()

// async function downloadIPFSData(uri: string): Promise<string> {
//   const { create } = await import('ipfs-http-client')
//   const auth = 'Basic ' + Buffer.from(process.env.INFURA_ID + ':' + process.env.INFURA_KEY).toString('base64')

//   const ipfs = await create({
//     host: 'ipfs.infura.io',
//     port: 5001,
//     protocol: 'https',
//     headers: {
//       authorization: auth,
//     },
//   })

//   let data = ''

//   const metadata = await ipfs.cat(uri)

//   const cid = metadata.cid

//   for await (const file of ipfs.get(uri)) {
//     if (!file.content) continue
//     for await (const chunk of file.content) {
//       data += chunk.toString()
//     }
//   }
//   return data
// }
