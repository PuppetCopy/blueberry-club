import fs from 'fs'


const delay = (time: number): Promise<number> => new Promise(resolve => setTimeout(() => resolve(time), time));

(async function downloadAll() {

  // create directory for metadata files
  const directory = './metadata'
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory)
  }
  const files = (await fs.promises.readdir(directory)).length 
  // get total supply of tokens
  const totalSupply = 10000

  // loop through all token IDs and download metadata files
  for (let i = files; i < totalSupply; i++) {
    const tokenId = i + 1
    await delay(3000)
    const metadata = await fetch(`https://ipfs.io/ipfs/QmZfVGMtQPeSfre5yHDzDdw4ocZ1WEakGtbYqvtvhhD4zQ/${tokenId}`).then(async res => res.json())

    const filename = `${directory}/${tokenId}.json`

    console.log(filename)

    fs.writeFileSync(filename, JSON.stringify(metadata))
  }
})()

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
