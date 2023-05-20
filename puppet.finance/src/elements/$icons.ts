import { $svg, attr } from "@aelea/dom"


const $path = $svg('path')

export const $stackedCoins = $path(
  attr({
    d: 'M7 13.525V16c0 2.26 3.92 4.5 9 4.5s9-2.24 9-4.5v-2.475C22.783 15.073 19.545 16 16 16s-6.783-.927-9-2.475zM4 8.5C4 4.133 9.482 1 16 1s12 3.133 12 7.5v15c0 4.367-5.482 7.5-12 7.5S4 27.867 4 23.5v-15zm3 12.526V23.5c0 2.26 3.92 4.5 9 4.5s9-2.24 9-4.5v-2.474c-2.217 1.547-5.455 2.474-9 2.474s-6.783-.927-9-2.474zM16 13c5.08 0 9-2.24 9-4.5S21.08 4 16 4 7 6.24 7 8.5s3.92 4.5 9 4.5z'
  })
)()

export const $bagOfCoins = $path(
  attr({
    d: 'M16 28v-3c0-.547.127-1.059.348-1.5A3.346 3.346 0 0116 22v-3c0-1.657 1.164-3 2.6-3h5.505c-2.099-3.622-5.127-6-8.105-6-5.121 0-10.4 7.48-10.4 13.5C5.6 27.273 7.648 28 16 28zm2.6 0h7.8v-3h-7.8v3zm7.8 3H16c-4.864 0-6.72-.124-8.67-.817C4.524 29.188 3 27.005 3 23.5 3 17.54 6.925 10.719 11.865 8.1c-1.023-1.17-1.788-2.862-2.28-5.027-.203-.884.255-1.789 1.02-2.02.18-.045.18-.045.363-.054H21.03c.79-.001 1.432.738 1.432 1.65-.008.211-.008.211-.047.418-.49 2.154-1.247 3.839-2.26 5.008 2.848 1.488 5.357 4.41 7.052 8.072C28.248 16.54 29 17.668 29 19v3c0 .546-.126 1.059-.348 1.5.222.441.348.953.348 1.5v3c0 1.657-1.164 3-2.6 3zm0-9v-3h-7.8v3h7.8zM16 7c1.53 0 2.647-.925 3.411-3H12.59c.764 2.075 1.88 3 3.411 3z'
  })
)()

export const $trash = $path(
  attr({
    d: 'M6.24 18.84A2.16 2.16 0 008.4 21h7.2a2.16 2.16 0 002.16-2.16L19.2 7.32H4.8l1.44 11.52zm7.92-9.36h1.44v9.36h-1.44V9.48zm-2.88 0h1.44v9.36h-1.44V9.48zm-2.88 0h1.44v9.36H8.4V9.48zm10.44-5.04h-4.68S13.838 3 13.44 3h-2.88c-.398 0-.72 1.44-.72 1.44H5.16a1.08 1.08 0 00-1.08 1.08V6.6h15.84V5.52a1.08 1.08 0 00-1.08-1.08z'
  })
)()

export const $tofunft = $path(
  attr({
    d: 'M16.733 1.381A5.556 5.556 0 0014.69 1c-.712 0-1.398.127-2.058.381A5.249 5.249 0 0010.89 2.46c-.29.268-.546.57-.764.9V1.238H1v2.619h3.094v7.967h2.938V3.857h2.8c-.06.114-.116.23-.168.349-.293.688-.44 1.47-.44 2.349 0 .879.147 1.661.44 2.349a5.228 5.228 0 001.225 1.746c.508.473 1.1.844 1.744 1.095.66.244 1.346.366 2.058.366a5.76 5.76 0 002.041-.366 5.429 5.429 0 001.76-1.095A5.046 5.046 0 0019.7 8.904c.304-.688.456-1.47.456-2.35 0-.878-.152-1.66-.456-2.348a5.046 5.046 0 00-1.21-1.746 5.213 5.213 0 00-1.758-1.079zm-3.3 2.761a2.22 2.22 0 011.258-.365c.47 0 .89.122 1.256.366.377.243.67.576.88 1 .21.412.314.883.314 1.412 0 .529-.105 1.005-.314 1.429-.21.412-.503.74-.88.984a2.218 2.218 0 01-1.256.365 2.22 2.22 0 01-1.257-.365 2.655 2.655 0 01-.88-.984c-.209-.424-.314-.9-.314-1.43 0-.528.104-1 .315-1.412.203-.404.505-.748.879-1zm6.315 14.66v-6.46H16.81v6.254c0 .55-.146 1-.438 1.35-.294.337-.755.512-1.383.523-.629.01-1.089-.16-1.382-.508-.293-.36-.44-.815-.44-1.365v-6.254H10.23v6.46c0 .92.214 1.714.643 2.38a4.288 4.288 0 001.729 1.54c.722.35 1.518.524 2.387.524.88 0 1.675-.174 2.387-.523a4.29 4.29 0 001.728-1.54c.43-.667.644-1.46.644-2.38zm-11.051.619v-2.619H4.958v-1.809h4.524v-2.619H2.02v10.634h2.937v-3.587h3.739zm17.92-.318h-2.59v-3.778h-3.55v-2.968H31V29h-2.592v-3.127h-7.885v-2.968h7.885v-7.58h-1.79v3.778zm-6.143-8.153H31V8.268h-5.419L31 2.284V1.237H20.474v2.746h5.012l-5.01 5.92-.002 1.047z'
  })
)()

export const $opensea = $path(
  attr({
    d: 'M16 1C7.717 1 1 7.717 1 16c0 8.283 6.717 15 15 15 8.283 0 15-6.717 15-15 0-8.283-6.714-15-15-15zM8.401 16.504l.063-.102 3.903-6.105c.057-.087.192-.078.234.018.651 1.461 1.215 3.279.951 4.41-.111.465-.42 1.095-.768 1.677a3.006 3.006 0 01-.147.249.132.132 0 01-.111.057H8.515a.133.133 0 01-.114-.204zm17.391 2.1a.136.136 0 01-.081.126c-.303.129-1.338.606-1.767 1.203-1.098 1.527-1.935 3.711-3.81 3.711h-7.818c-2.772 0-5.016-2.253-5.016-5.034v-.09c0-.072.06-.132.135-.132h4.356c.087 0 .15.078.144.165-.033.282.021.573.156.837.258.525.795.852 1.374.852h2.157v-1.683h-2.133a.138.138 0 01-.111-.216 16.49 16.49 0 00.855-1.353 9.96 9.96 0 00.537-1.074c.03-.066.054-.135.081-.201.042-.117.084-.228.114-.336.03-.093.057-.189.081-.279a4.38 4.38 0 00.102-.984 4.59 4.59 0 00-.018-.408c-.006-.147-.024-.294-.042-.441-.012-.129-.036-.258-.06-.39a8.117 8.117 0 00-.123-.585l-.018-.075c-.036-.135-.069-.261-.111-.396a14.78 14.78 0 00-.411-1.215 6.515 6.515 0 00-.177-.444c-.09-.222-.183-.423-.267-.612a4.454 4.454 0 01-.117-.246c-.042-.09-.084-.18-.129-.267-.03-.066-.066-.129-.09-.189l-.264-.486c-.036-.066.024-.147.096-.126l1.65.447h.012l.216.063.24.066.087.024v-.978c0-.474.378-.858.849-.858.234 0 .447.096.597.252a.862.862 0 01.249.606v1.455l.177.048c.012.006.027.012.039.021.042.03.105.078.183.138.063.048.129.108.207.171a12.94 12.94 0 01.717.63c.267.249.567.54.855.864.081.093.159.183.24.282.078.099.165.195.237.291.099.129.201.264.294.405.042.066.093.135.132.201.12.177.222.36.321.543.042.084.084.177.12.267.111.246.198.495.252.747.018.054.03.111.036.165v.012c.018.072.024.15.03.231a2.571 2.571 0 01-.132 1.092c-.039.105-.075.213-.123.318a4.315 4.315 0 01-.33.627c-.042.075-.093.153-.141.228-.054.078-.111.153-.159.225a4.863 4.863 0 01-.216.276c-.066.09-.132.18-.207.261a7.035 7.035 0 01-.306.348c-.06.072-.126.147-.195.213-.066.075-.135.141-.195.201-.105.105-.189.183-.261.252l-.171.153a.127.127 0 01-.09.036h-1.314v1.683h1.653c.369 0 .72-.129 1.005-.372.096-.084.519-.45 1.02-1.002a.118.118 0 01.063-.039l4.563-1.32a.134.134 0 01.171.129v.966z'
  })
)()

export const $gift = $path(attr({ d: 'M26.677 30.681H5.324a1.335 1.335 0 01-1.335-1.335V16.001a1.335 1.335 0 012.669 0v12.011h18.684V16.001a1.335 1.335 0 112.669 0v13.345a1.335 1.335 0 01-1.334 1.335zM2.655 7.993h26.691a1.335 1.335 0 011.335 1.335v6.673a1.335 1.335 0 01-1.335 1.335H2.655a1.335 1.335 0 01-1.335-1.335V9.328a1.335 1.335 0 011.335-1.335zm25.357 2.669H3.989v4h24.023zM16.001 30.681a1.335 1.335 0 01-1.335-1.335V9.328a1.335 1.335 0 112.669 0v20.018a1.335 1.335 0 01-1.334 1.335zm6.005-20.019h-6.005a1.335 1.335 0 01-1.309-1.6 14.463 14.463 0 011.39-3.718c1.45-2.631 3.498-4.024 5.924-4.024a4.671 4.671 0 013.3 7.974 4.641 4.641 0 01-3.3 1.368zm-4.21-2.669h4.21a2 2 0 100-4c-2.286-.004-3.581 2.344-4.21 4zm-1.795 2.669H9.995a4.671 4.671 0 01-3.3-7.974 4.64 4.64 0 013.3-1.368c2.426 0 4.475 1.393 5.924 4.028a14.462 14.462 0 011.39 3.718 1.335 1.335 0 01-1.309 1.6zM9.995 3.989a2 2 0 100 4h4.21c-.629-1.652-1.924-4-4.21-4z' }))()

export const $discount = $path(
  attr({
    d: 'M19.75 22a2.25 2.25 0 110-4.5 2.25 2.25 0 010 4.5zm-7.5-7.5a2.25 2.25 0 110-4.5 2.25 2.25 0 010 4.5zm7.19-4.06a1.5 1.5 0 112.12 2.12l-9 9a1.5 1.5 0 11-2.12-2.12l9-9zM16 30.104c-.694 0-1.178.105-1.874.358l-.418.154a9.527 9.527 0 01-.476.162c-1.088.334-2.074.307-3.274-.19-1.402-.581-2.06-1.316-2.673-2.633-.539-1.159-.684-1.408-1.258-1.982-.574-.574-.823-.72-1.982-1.258-1.317-.613-2.052-1.27-2.633-2.673-.497-1.2-.524-2.186-.19-3.274.046-.149.096-.295.162-.476l.154-.418c.253-.696.358-1.18.358-1.874 0-.694-.105-1.178-.358-1.874l-.154-.418a9.498 9.498 0 01-.162-.476c-.334-1.088-.307-2.074.19-3.274.581-1.402 1.316-2.06 2.633-2.673 1.159-.539 1.408-.684 1.982-1.258.574-.574.72-.823 1.258-1.982.613-1.317 1.27-2.052 2.673-2.633 1.2-.497 2.186-.524 3.274-.19.149.046.295.096.476.162l.418.154c.696.253 1.18.358 1.874.358.694 0 1.178-.105 1.874-.358l.418-.154c.181-.066.327-.116.476-.162 1.088-.334 2.074-.307 3.274.19 1.402.581 2.06 1.316 2.673 2.633.539 1.159.684 1.408 1.258 1.982.574.574.823.72 1.982 1.258 1.317.613 2.052 1.27 2.633 2.673.497 1.2.524 2.186.19 3.274a9.527 9.527 0 01-.162.476l-.154.418c-.253.696-.358 1.18-.358 1.874 0 .694.105 1.178.358 1.874l.154.418c.066.181.116.327.162.476.334 1.088.307 2.074-.19 3.274-.581 1.402-1.316 2.06-2.633 2.673-1.159.539-1.408.684-1.982 1.258-.574.574-.72.823-1.258 1.982-.613 1.317-1.27 2.052-2.673 2.633-1.2.497-2.186.524-3.274.19a9.527 9.527 0 01-.476-.162l-.418-.154c-.696-.253-1.18-.358-1.874-.358zm0-3c1.09 0 1.9.176 2.898.538l.422.156c.137.05.238.085.33.113.439.134.709.127 1.244-.095.62-.256.779-.434 1.1-1.127-.024.054.19-.413.259-.555.119-.248.234-.468.363-.69a7.749 7.749 0 011.236-1.592 7.749 7.749 0 011.593-1.236c.22-.13.441-.244.69-.363.14-.068.608-.283.554-.258.693-.322.87-.482 1.127-1.1.222-.536.23-.806.095-1.245a6.721 6.721 0 00-.113-.33l-.156-.422c-.362-.998-.537-1.809-.537-2.898 0-1.09.175-1.9.537-2.898l.156-.422c.05-.137.085-.239.113-.33.134-.439.127-.709-.095-1.244-.256-.62-.434-.779-1.127-1.1.054.024-.413-.19-.555-.258a9.324 9.324 0 01-.69-.364 7.75 7.75 0 01-1.592-1.236 7.749 7.749 0 01-1.236-1.593 9.331 9.331 0 01-.363-.69 57.124 57.124 0 01-.258-.554c-.322-.693-.482-.87-1.1-1.127-.536-.222-.806-.23-1.245-.095a6.71 6.71 0 00-.33.113l-.422.156c-.998.362-1.809.538-2.898.538-1.09 0-1.9-.176-2.898-.538l-.422-.156a6.71 6.71 0 00-.33-.113c-.439-.135-.709-.127-1.244.095-.62.256-.779.434-1.1 1.127.024-.054-.19.413-.258.555-.12.248-.235.468-.364.69a7.75 7.75 0 01-1.236 1.592 7.75 7.75 0 01-1.593 1.236c-.22.13-.441.244-.69.364-.14.067-.608.282-.554.257-.693.322-.87.481-1.127 1.1-.222.536-.23.806-.095 1.245.028.091.063.193.113.33l.156.422c.362.998.538 1.809.538 2.898 0 1.09-.176 1.9-.538 2.898l-.156.422a6.71 6.71 0 00-.113.33c-.135.439-.127.709.095 1.244.256.62.434.779 1.127 1.1-.054-.024.413.19.555.259.248.119.468.234.69.363a7.749 7.749 0 011.592 1.236 7.75 7.75 0 011.236 1.593c.13.22.244.441.364.69.067.14.282.608.257.554.322.693.481.87 1.1 1.127.536.222.806.23 1.245.095.091-.028.193-.063.33-.113l.422-.156c.998-.362 1.809-.537 2.898-.537z'
  })
)()


export const $caretDown = $path(attr({
  d: 'M16.866 22.5a1 1 0 01-1.732 0l-5.196-9a1 1 0 01.866-1.5h10.392a1 1 0 01.866 1.5l-5.196 9z'
}))()


