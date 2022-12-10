import { $Branch, $node, $text, attr, style } from "@aelea/dom"
import { $ButtonIcon, $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete, theme } from "@aelea/ui-components-theme"
import { getAccountExplorerUrl, getTxExplorerUrl, shortenAddress } from "@gambitdao/gmx-middleware"
import { $trash } from "./$icons"
import { IToken, LAB_CHAIN } from "@gambitdao/gbc-middleware"
import { $anchor, $calendar, $caretDblDown, $discord, $ethScan } from "@gambitdao/ui-components"
import { $berryByToken } from "../logic/common"
import { hexValue } from "@ethersproject/bytes"

export const $TrashBtn = $ButtonIcon($trash)

export const $card = $column(layoutSheet.spacing, style({ backgroundColor: theme.name === 'dark' ? pallete.horizon : colorAlpha(pallete.horizon, .3), padding: '22px', borderRadius: '20px', flex: 1 }))

export const $seperator = $text(style({ color: pallete.foreground, pointerEvents: 'none' }))('|')
export const $responsiveFlex = screenUtils.isDesktopScreen ? $row : $column

function formatTime(date: Date) {
  const newLocal = date.toISOString().replace(/-|:|\.\d+/g, '')
  return newLocal
}

export const $labeledDivider = (label: string) => {
  return $row(layoutSheet.spacing, style({ placeContent: 'center', alignItems: 'center' }))(
    $column(style({ flex: 1, borderBottom: `1px solid ${pallete.horizon}` }))(),
    $row(layoutSheet.spacingSmall, style({ color: pallete.foreground, alignItems: 'center' }))(
      $text(style({ fontSize: '75%' }))(label),
      $icon({ $content: $caretDblDown, width: '10px', viewBox: '0 0 32 32', fill: pallete.foreground }),
    ),
    $column(style({ flex: 1, borderBottom: `1px solid ${pallete.horizon}` }))(),
  )
}

// <a class="atc-link icon-google" target="_blank" href=">Google Calendar</a>

// 				<a class="atc-link icon-ical" target="_blank" href="">iCal Calendar</a>


export interface IAddtoCalendarButton {
  time: Date
  title: string
  description?: string
  location?: string
}

export const $addToCalendar = (config: IAddtoCalendarButton) => {
  console.log(String(new Date(config.time)))

  const isApple = ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  const href = isApple
    ? `data:text/calendar;charset=utf8,BEGIN:VCALENDAR
  VERSION:2.0
  BEGIN:VEVENT
  URL:${document.location.href}
  DTSTART:${config.time.toISOString()}
  DTEND:${config.time}
  SUMMARY:${config.title}
  DESCRIPTION:${config.description ? encodeURIComponent(config.description) : ''}
  LOCATION:${config.location}
  ${config.description ? `LOCATION:${encodeURIComponent(config.description)}` : ''}
  END:VEVENT
  END:VCALENDAR`
    : `http://www.google.com/calendar/render?
action=TEMPLATE
&text=${config.title}
&dates=${formatTime(config.time)}/${formatTime(config.time)}
${config.description ? `&details=${encodeURIComponent(config.description)}` : ''}
&location=${config.location}
&trp=false
&sprop=
&sprop=name:`


  return $anchor(attr({ href, target: '_blank' }), style({ padding: '0 4px', border: `2px solid ${pallete.horizon}`, borderRadius: '50%', alignItems: 'center', placeContent: 'center', height: '42px', width: '42px' }))(
    $icon({ $content: $calendar, width: '22px', viewBox: `0 0 32 32` })
  )
}



export const $iconCircular = ($iconPath: $Branch<SVGPathElement>, backgroundColor = pallete.horizon) => {
  return $icon({
    $content: $iconPath,
    svgOps: style({
      backgroundColor: backgroundColor, zIndex: 10, borderRadius: '50%', cursor: 'pointer',
      height: '22px', width: '22px', fontSize: '11px', textAlign: 'center', lineHeight: '15px', fontWeight: 'bold', color: pallete.message,
    }),
    width: '18px', viewBox: '0 0 32 32'
  })
}



export const $accountRef = (id: string) => $anchor(attr({ href: getAccountExplorerUrl(LAB_CHAIN, id) }))(
  $text(style({}))(`${shortenAddress(id)}`)
)


export const $accountIconLink = (address: string) => $anchor(attr({ href: getAccountExplorerUrl(LAB_CHAIN, address) }))(
  $icon({ $content: $ethScan, width: '16px', viewBox: '0 0 24 24', svgOps: style({ margin: '3px 4px 0 0' }) }),
  $text(style({}))(` ${shortenAddress(address)} `),
)

export const $txnIconLink = (address: string) => $anchor(attr({ href: getTxExplorerUrl(LAB_CHAIN, address) }))(
  $icon({ $content: $ethScan, width: '16px', viewBox: '0 0 24 24' })
)


interface ITeamMember {
  name: string
  title: string
  size?: 'small' | 'big'
  token: IToken
}

export const $teamMember = ({ name, title, size = 'big', token }: ITeamMember) => {
  return $column(layoutSheet.spacing, style({ flexBasis: size === 'small' ? '110px' : '', alignItems: 'center', fontSize: screenUtils.isDesktopScreen ? '' : '75%' }))(
    style({ borderRadius: '15px' }, $berryByToken(token, size === 'big' ? 100 : 75)),
    $column(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
      $anchor(attr(({ href: `https://twitter.com/${name}` })), style({ fontWeight: 900, textDecoration: 'none', fontSize: size === 'big' ? '1em' : '.75em' }))($text(`@${name}`)),
      $text(style({ fontSize: '.75em', color: pallete.foreground, textAlign: 'center', lineHeight: '1.3' }))(title),
    )
  )
}
