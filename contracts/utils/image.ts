import { IBerryDisplayTupleMap, berryPartsToSvg, getLabItemTupleIndex, labAttributeTuple } from "@gambitdao/gbc-middleware"

const tupleLength = labAttributeTuple.length

export const labItemSvg = (id: number) => {
  const state = getLabItemTupleIndex(id)
  const localTuple = Array(tupleLength).fill(undefined) as IBerryDisplayTupleMap
  localTuple.splice(state, 1, id)


  // @ts-ignore
  return `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMin meet" fill="none" viewBox="0 0 1500 1500">${berryPartsToSvg(localTuple)}</svg>`
}