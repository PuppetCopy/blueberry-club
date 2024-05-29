import { BASIS_POINTS_DIVISOR, div, getMarginFees, IAccountSummary, importGlobal, intervalTimeMap, unixTimestampNow, USD_PERCISION } from "@gambitdao/gmx-middleware"
import { map } from "@most/core"
import { IAttributeBackground, IAttributeClothes, IAttributeBody, IAttributeExpression, IAttributeFaceAccessory, IAttributeHat, LabItemSale, MintRule, SvgPartsMap, IBerryDisplayTupleMap, IAttributeBadge, ICompetitionSchedule, ICompetitionPrize } from "./types"

const svgParts = importGlobal(import("@gambitdao/gbc-middleware/src/mappings/svgParts"))

export const labAttributeTuple = [IAttributeBackground, IAttributeClothes, IAttributeBody, IAttributeExpression, IAttributeFaceAccessory, IAttributeHat, IAttributeBadge] as const

export const getLabItemTupleIndex = (itemId: number) => {
  const attrMap = itemId in IAttributeHat
    ? IAttributeHat : itemId in IAttributeBackground
      ? IAttributeBackground : itemId in IAttributeClothes
        ? IAttributeClothes : itemId in IAttributeFaceAccessory
          ? IAttributeFaceAccessory : itemId in IAttributeExpression
            ? IAttributeExpression : itemId in IAttributeBadge
              ? IAttributeBadge : null

  if (attrMap === null) {
    throw new Error(`item id: ${itemId} doesn't match any attribute`)
  }

  return labAttributeTuple.indexOf(attrMap)
}

export function saleMaxSupply(sale: LabItemSale): number {
  return sale.mintRuleList.reduce((seed, next) => seed + next.supply, 0)
}

export function isSaleWithinTimeRange(rule: MintRule): boolean {
  const { start, finish } = rule
  const now = unixTimestampNow()
  return now > start && now < finish
}

export function getLatestSaleRule(sale: LabItemSale): MintRule {
  const l = sale.mintRuleList.length

  if (!l) {
    throw new Error('Sale contain no mint rules')
  }

  let match = sale.mintRuleList[0]

  if (l === 1) {
    return match
  }

  for (let index = 1; index < l; index++) {
    const element = sale.mintRuleList[index]
    if (element.start > match.start) {
      match = element
    }
  }

  return match
}

export const berrySvg = (tuple: Partial<IBerryDisplayTupleMap>) => {
  return map(parts => {
    return `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMin meet" fill="none" viewBox="0 0 1500 1500">${berryPartsToSvg(parts, tuple)}</svg>`
  }, svgParts)
}

export const berryPartsToSvg = (svgParts: SvgPartsMap, [background, clothes, body, expression, faceAccessory, hat, badge]: Partial<IBerryDisplayTupleMap>,) => {
  return `
    ${background ? svgParts[0][background] : ''}
    ${svgParts[1][clothes ? clothes : IAttributeClothes.NUDE]}
    ${svgParts[2][body ? body : IAttributeBody.BLUEBERRY]}
    ${expression ? svgParts[3][expression] : ''}
    ${faceAccessory ? svgParts[4][faceAccessory] : ''}
    ${svgParts[5][hat ? hat : IAttributeHat.NUDE]}
    ${badge ? svgParts[6][badge] : ''}
  `
}


export const competitionStartEpoch = 2023 + 6 // year + month


export function getCompetitionSchedule(unixTime = unixTimestampNow(), history = 0): ICompetitionSchedule {
  const date = new Date(unixTime * 1000)

  const epoch = Math.abs((date.getUTCFullYear() + date.getUTCMonth() + history) - competitionStartEpoch)

  date.setMonth(date.getUTCMonth() - history)

  const competitionYear = date.getUTCFullYear()
  const competitionMonth = date.getUTCMonth()

  const start = Date.UTC(competitionYear, competitionMonth) / 1000
  const duration = intervalTimeMap.HR24 * 25 + intervalTimeMap.MIN60 * 16
  const end = start + duration

  const elapsed = Math.min(unixTime, end) - start
  const ended = duration === elapsed

  const previous = unixTime >= start
    ? Date.UTC(competitionYear, competitionMonth - 1, 1, 16) / 1000
    : start
  const next = unixTime >= start
    ? Date.UTC(competitionYear, competitionMonth + 1, 1, 16) / 1000
    : start

  return { date, duration, start, end, elapsed, ended, next, previous, epoch }
}

export function getCompetitionMetrics(size: bigint, competition: ICompetitionSchedule): ICompetitionPrize {
  const estSize = size * BigInt(competition.duration) / BigInt(competition.elapsed)
  const feeMultiplier = 1500n
  const feePool = getMarginFees(size) * feeMultiplier / BASIS_POINTS_DIVISOR
  const estFeePool = feePool * BigInt(competition.duration) / BigInt(competition.elapsed)

  return { estSize, feePool, estFeePool, feeMultiplier }
}

const MIN_PNL_THRESHOLD = USD_PERCISION * 1n

export function isWinner(summary: IAccountSummary) {
  return summary.pnl > MIN_PNL_THRESHOLD
}
