import { IBerryDisplayTupleMap, berryPartsToSvg, getLabItemTupleIndex } from "@gambitdao/gbc-middleware"



export const labItemSvg = (id: number) => {
  const state = getLabItemTupleIndex(id)
  const localTuple = Array(5).fill(undefined) as IBerryDisplayTupleMap
  localTuple.splice(state, 1, id)

  // @ts-ignore
  return `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMin meet" fill="none" viewBox="0 0 1500 1500">${berryPartsToSvg(svgParts, localTuple)}</svg>`
}