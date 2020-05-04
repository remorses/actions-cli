import yargs, { CommandModule, Argv } from 'yargs'
import { loginOnLocalhost } from 'cli-social-login'
import fs from 'fs'
import { USER_TOKEN_CONFIG_KEY, firebaseConfig } from './constants'
import { initStore, printRed } from './support'

export default {
    command: 'logout',
    describe: 'Deletes the saved token',
    builder: (argv: Argv) => {},
    handler: async (argv) => {
        const store = initStore()
        store.delete(USER_TOKEN_CONFIG_KEY)
        console.log(`Deleted Token`)
    },
} // as CommandModule
