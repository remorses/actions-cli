import getAppDataPath from 'appdata-path'
import path from 'path'

const APP_DATA_FOLDER = 'containerful'
export const USER_TOKEN_CONFIG_KEY = 'token'
export const APP_DATA_PATH = path.resolve(getAppDataPath(APP_DATA_FOLDER))
