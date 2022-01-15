import { http } from "@aelea/ui-components"
import { DEPLOYED_CONTRACT } from "@gambitdao/gbc-middleware"
import { getGatewayUrl } from "@gambitdao/gmx-middleware"
import { GBC__factory } from "contracts"
import { ITokenMetadata } from "../types"
import { w3p } from "./provider"


export const gbc = GBC__factory.connect(DEPLOYED_CONTRACT, w3p)


export async function getBerryMetadata(id: string): Promise<ITokenMetadata> {
  const uri = await gbc.tokenURI(id)
  const gwUrl = getGatewayUrl(uri)
  const metadata = await http.fetchJson(gwUrl) as any
  return metadata
}


export async function getBerryPhotoFromMetadata(metadata: any) {
  try {
    const imageUrl = getGatewayUrl(metadata.image)
    const res = await fetch(imageUrl, { method: 'GET', mode: 'cors', cache: 'default', })
    const imageBlob = await res.blob()
    const imageObjectURL = URL.createObjectURL(imageBlob)
    
    return imageObjectURL
  } catch (err) {
    
    try {
      const uri = await gbc._baseTokenURI() + BigInt(metadata.id).toString()
      const gwUrl = getGatewayUrl(uri)
      const newLocal = await http.fetchJson(gwUrl) as any
      const imageUrl = getGatewayUrl(newLocal.image)
      const imageBlob = await (await fetch(imageUrl, { method: 'GET', mode: 'cors', cache: 'default', })).blob()

      const imageObjectURL = URL.createObjectURL(imageBlob)
      return imageObjectURL
    } catch (err) {
      throw new Error('IPFS Query Failed')
    }
  }
}



export async function getBerryJpegUrl(id: string) {
  const metadata = await getBerryMetadata(id)
  return getBerryPhotoFromMetadata(metadata)  
}