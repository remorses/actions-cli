import yargs, { CommandModule, Argv } from 'yargs'
import fs from 'fs'
import { USER_TOKEN_CONFIG_KEY } from './constants'
import { initStore, printRed } from './support'


export default {
    command: 'login',
    describe: 'Logins to cli',
    builder: (argv: Argv) => {
        argv.option('token', {
            type: 'string',
            default: '',
            required: true,
            description: 'The github token to use for login, requires actions permissions'
        })
    },
    handler: async (argv) => {
        const store = initStore()
        const token = argv['token']
        if (!token) {
            printRed('provide a Github token via `--token` option')
            return
        }
        store.set(USER_TOKEN_CONFIG_KEY, token)
        console.log(`Saved Token`)
    }
} // as CommandModule
