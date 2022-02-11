
import type { Theme } from '@aelea/ui-components-theme'


const light: Theme = {
  name: 'light',
  pallete: {
    primary: '#2c98f3',

    message: '#000000',

    background: '#ffffff',
    horizon: '#e1e5f1',
    middleground: '#b7daff',
    foreground: '#3b565f',

    positive: '#0cab00',
    negative: '#ea004c',
    indeterminate: '#dccb07',
  }
}

const dark: Theme = {
  name: 'dark',
  pallete: {
    primary: '#5b6adb',

    message: '#ffffff',

    background: '#171B1F',
    horizon: '#242c34',
    middleground: '#3c4956',
    foreground: '#bfbbcf',

    positive: '#38E567',
    negative: '#FA4333',
    indeterminate: '#dccb07',
  }
}


export { light, dark }

