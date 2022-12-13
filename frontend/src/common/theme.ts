
import type { Theme } from '@aelea/ui-components-theme'


const light: Theme = {
  name: 'light',
  pallete: {
    primary: '#000',

    message: '#171B1F',

    background: '#FDFDFC',
    horizon: '#C0C0C0',
    middleground: '#939CD6',
    foreground: '#51585f',

    positive: '#0cab00',
    negative: '#ea004c',
    indeterminate: '#F6964C',
  }
}

const dark: Theme = {
  name: 'dark',
  pallete: {
    primary: '#fff',

    message: '#ffffff',

    background: '#171B1F',
    horizon: '#242c34',
    middleground: '#98b0c5',
    foreground: '#bfbbcf',

    positive: '#38E567',
    negative: '#FA4333',
    indeterminate: '#F6964C',
  }
}


export { light, dark }

