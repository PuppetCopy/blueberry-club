import { DEPLOYED_CONTRACT } from "@gambitdao/gbc-middleware"
import { GBC__factory } from "contracts"
import { w3p } from "./provider"

export const gbc = GBC__factory.connect(DEPLOYED_CONTRACT, w3p)