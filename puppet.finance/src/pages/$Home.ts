import { Behavior } from "@aelea/core"
import { $element, $node, $text, component, eventElementTarget, style, styleBehavior, styleInline } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $icon, $row, designSheet, layoutSheet, screenUtils } from "@aelea/ui-components"
import { $alert, $anchor, $Link } from "@gambitdao/ui-components"
import {
  ITreasuryStore
} from "@gambitdao/gbc-middleware"
import { $ButtonSecondary } from "../components/form/$Button"
import { BrowserStore } from "../logic/store"
import { pallete } from "@aelea/ui-components-theme"
import { $gmxLogo, $puppetLogo } from "../common/$icons"
import { empty, map } from "@most/core"



export interface ITreasury {
  parentRoute: Route
  treasuryStore: BrowserStore<"ROOT.v1.treasuryStore", ITreasuryStore>
}

const styleEl = document.createElement('style')
document.getElementsByTagName('head')[0].appendChild(styleEl)

function createAnimationKeyframe(keyframes: string) {
  const animationId = 'anim' + (Math.random() + 1).toString(36).substring(7)

  const kframes = `@keyframes ${animationId} {${keyframes}}`
  styleEl.innerHTML = `${styleEl.innerHTML}${kframes}`

  return animationId
}




export const $Home = (config: ITreasury) => component((
  [routeChanges, linkClickTether]: Behavior<any, string>,
) => {

  const wheelClockwise = createAnimationKeyframe(`
	0% {
    transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
`)

  const wheelCounterClockwise = createAnimationKeyframe(`
  0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(-360deg);
	}
  `)



  const $snapSection = $column(style({ alignItems: 'center', gap: '26px', scrollSnapAlign: 'start', minHeight: '100vh', placeContent: 'center' }))

  const $wheelWrapper = $node(style({
    pointerEvents: 'none',
    position: 'absolute',
    width: `100vw`,
    height: `100vw`,
    top: '50%',
    transform: 'translateY(-50%)',
  }))
  const $wheel = $node(style({
    border: '1px solid #4d4d4d',
    borderRadius: '50%',
    inset: '0',
    position: 'absolute',

  }))
  const $cabin = $node(style({
    // zIndex: 1,
    display: 'block',
    backgroundColor: pallete.background,
    borderRadius: '50%',
    width: '70px',
    height: '70px',
    transform: 'translateX(-50%)',
    border: '1px solid #4d4d4d',
    position: 'absolute',
  }))

  const bodyPointerMove = eventElementTarget('pointermove', document.body)

  return [
    $column(style(screenUtils.isDesktopScreen ? {} : {}))(

      $snapSection(layoutSheet.spacingBig,
        style({
          placeSelf: 'center',
          maxWidth: '600px',
          position: 'relative',
          top: 0,
          height: `100vh`,
          alignItems: 'center',
          placeContent: 'center'
        })
      )(


        $column(style({ textAlign: 'center' }))(
          $text(style({ fontWeight: 'bold', fontSize: screenUtils.isDesktopScreen ? '2.5em' : '1.75em' }))('Matching top Traders with Investors'),
        ),
        $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))(`Traders earn more, investors minimize their risks by mirroring multiple performant traders on a single deposit.`),

        $column(layoutSheet.spacing)(
          screenUtils.isMobileScreen ? $text(style({ textAlign: 'center' }))('< which are you? >') : empty(),

          $row(layoutSheet.spacing, style({ alignItems: 'center' }))(

            $Link({
              $content: $anchor(
                $ButtonSecondary({
                  $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $icon({ $content: $puppetLogo, width: '24px', height: '24px', viewBox: '0 0 32 32' }),
                    $text('Investor'),
                    $node(
                      styleInline(map(move => {
                        const shalf = document.body.clientWidth / 2
                        const alpha = (shalf - move.clientX) / shalf

                        console.log(alpha)

                        return { opacity: alpha }
                      }, bodyPointerMove)),
                      style({
                        pointerEvents: 'none',
                        background: pallete.negative,
                        filter: 'blur(1em)',
                        width: '100%',
                        height: '100%',
                        left: '0px',
                        top: '120%',
                        position: 'absolute',
                        content: '. ',
                        transform: 'perspective(1em) rotateX(40deg) scale(1, 0.35)'
                      })
                    )()
                  ),
                  $container: $element('button')(
                    designSheet.btn,
                    style({ position: 'relative', borderRadius: '30px' })
                  )
                })({})
              ),
              url: '/p/treasury', route: config.parentRoute.create({ fragment: 'fefe' })
            })({
              click: linkClickTether()
            }),

            screenUtils.isDesktopScreen ? $text('< which are you? >') : empty(),

            $Link({
              $content: $anchor(
                $ButtonSecondary({
                  $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $icon({ $content: $gmxLogo, width: '24px', height: '24px', viewBox: '0 0 32 32' }),
                    $text('Trader'),
                    $node(
                      styleInline(map(move => {
                        const shalf = document.body.clientWidth / 2
                        const alpha = (shalf - move.clientX) / shalf

                        return { opacity: alpha > 0 ? 0 : Math.abs(alpha) }
                      }, bodyPointerMove)),
                      style({
                        pointerEvents: 'none',
                        background: pallete.positive,
                        filter: 'blur(1em)',
                        width: '100%',
                        height: '100%',
                        left: '0px',
                        top: '120%',
                        position: 'absolute',
                        content: '. ',
                        transform: 'perspective(1em) rotateX(40deg) scale(1, 0.35)'
                      })
                    )()
                  ),

                  $container: $element('button')(
                    designSheet.btn,
                    style({ position: 'relative', borderRadius: '30px' })
                  )
                })({})
              ),
              url: '/p/treasury', route: config.parentRoute.create({ fragment: 'fefe' })
            })({
              click: linkClickTether()
            }),

          ),
        ),


        $wheelWrapper(style({
          right: 'calc(100% + 15px)',
        }))(
          $wheel(style({ animation: `${wheelClockwise} 55s linear infinite` }))(
            $cabin(style({ left: '50%', top: '-35px', animation: `${wheelCounterClockwise} 55s linear infinite` }))(
            ),
            $cabin(style({ left: '50%', bottom: '-35px', animation: `${wheelCounterClockwise} 55s linear infinite` }))(
            ),
            $cabin(style({ top: '50%', left: '-35px', animation: `${wheelCounterClockwise} 55s linear infinite` }))(
            ),
            $cabin(style({ top: '50%', right: '-35px', animation: `${wheelCounterClockwise} 55s linear infinite` }))(
            ),
          )
        ),
        $wheelWrapper(style({
          // transform: 'translate(-50%, -50%)',
          left: 'calc(100% + 15px)',
          // transform: `translate3d(calc(50% - 400px), 0%, 0px)`,
        }))(
          $wheel(style({ animation: `${wheelClockwise} 35s linear infinite` }))(
            $cabin(style({ left: '50%', top: '-35px', animation: `${wheelCounterClockwise} 35s linear infinite` }))(
            ),
            $cabin(style({ left: '50%', bottom: '-35px', animation: `${wheelCounterClockwise} 35s linear infinite` }))(
            ),
            $cabin(style({ top: '50%', left: '-35px', animation: `${wheelCounterClockwise} 35s linear infinite` }))(
            ),
            $cabin(style({ top: '50%', right: '-35px', animation: `${wheelClockwise} 35s linear infinite` }))(
            ),

          )
        )
      ),


      $snapSection(
        // $icon({ $content: $logo, width: '100px', viewBox: '0 0 32 32' }),

        $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
          $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Treasury'),
          $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))(`Yield is used to support GBC's underlaying value through our products`),
        ),

        style({ alignSelf: 'center' })(
          $alert($text(`Treasury graph is out of sync due to new upcomming changes, stay tuned for a whole new overhaul`))
        ),

        $node(),
      ),

      $snapSection(
        // $icon({ $content: $logo, width: '100px', viewBox: '0 0 32 32' }),

        $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
          $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Treasury'),
          $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))(`Yield is used to support GBC's underlaying value through our products`),
        ),

        style({ alignSelf: 'center' })(
          $alert($text(`Treasury graph is out of sync due to new upcomming changes, stay tuned for a whole new overhaul`))
        ),

        $node(),


        $Link({
          $content: $anchor(
            $ButtonSecondary({
              $content: $text('Treasury Page')
            })({})
          ),
          url: '/p/treasury', route: config.parentRoute.create({ fragment: 'fefe' })
        })({
          click: linkClickTether()
        }),
      ),

      $snapSection(
        // $icon({ $content: $logo, width: '100px', viewBox: '0 0 32 32' }),

        $column(layoutSheet.spacingBig, style({ alignItems: 'center' }))(
          $text(style({ fontWeight: 'bold', fontSize: '2.5em' }))('Treasury'),
          $text(style({ whiteSpace: 'pre-wrap', textAlign: 'center', maxWidth: '878px' }))(`Yield is used to support GBC's underlaying value through our products`),
        ),

        style({ alignSelf: 'center' })(
          $alert($text(`Treasury graph is out of sync due to new upcomming changes, stay tuned for a whole new overhaul`))
        ),

        $node(),


        $Link({
          $content: $anchor(
            $ButtonSecondary({
              $content: $text('Treasury Page')
            })({})
          ),
          url: '/p/treasury', route: config.parentRoute.create({ fragment: 'fefe' })
        })({
          click: linkClickTether()
        }),
      ),

    ),

    {
      routeChanges
    }
  ]
})





