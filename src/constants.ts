import getAppDataPath from 'appdata-path'
import path from 'path'

const APP_DATA_FOLDER = 'actions-cli'
export const USER_TOKEN_CONFIG_KEY = 'token'
export const APP_DATA_PATH = path.resolve(getAppDataPath(APP_DATA_FOLDER))
export const firebaseConfig = {
    apiKey: 'AIzaSyAdM1fGOP_2bxM72M-Tf91wI76WiSe1ajE',
    authDomain: 'actions-cli-85f6f.firebaseapp.com',
    databaseURL: 'https://actions-cli-85f6f.firebaseio.com',
    projectId: 'actions-cli-85f6f',
    storageBucket: 'actions-cli-85f6f.appspot.com',
    messagingSenderId: '846622072078',
    appId: '1:846622072078:web:d7f258caf4cc93e6090b5f',
    measurementId: 'G-01QPNTKXC1',
}
