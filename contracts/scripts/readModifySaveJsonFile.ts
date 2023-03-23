
import fs from 'fs/promises'

const totalSupply = 10000

async function readModifySaveJsonFile() {
  const ipfsUri = `ipfs://bafybeiedolf4e4cwa75atgtrng4apyrzbhw6axeyiiqs7gt3xpdqy6tipi/`

  for (let i = 0; i < totalSupply; i++) {
    const filePath = `./.ipfs/metadata/${i + 1}`

    try {
      // Read the JSON file
      const jsonData = await fs.readFile(filePath, 'utf-8')

      // Parse the JSON data
      const jsonObj = JSON.parse(jsonData)

      // Modify the JSON object (example: add a new property)
      jsonObj.image = `${ipfsUri + (i + 1)}.webp`
      // jsonObj.description = `10,000 Blueberries NFT Collection on Arbitrum, building community-driven gmx.io products and having fun together.`

      // Convert the modified JSON object back to a string
      const modifiedJsonData = JSON.stringify(jsonObj)

      // Save the modified JSON data to the file
      await fs.writeFile(filePath, modifiedJsonData, 'utf-8')

      console.log(`${filePath} modified successfully.`)
    } catch (error) {
      console.error(`Error reading or modifying ${filePath}:`, error)
    }

  }

}


readModifySaveJsonFile()
