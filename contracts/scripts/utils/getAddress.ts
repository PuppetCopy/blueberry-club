
import { ethers } from "ethers"

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

export default (address: string) => {
  try {
    return ethers.utils.getAddress(address)
  } catch (e) {
    return ZERO_ADDRESS
  }
}
