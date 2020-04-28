import yargs, { CommandModule, Argv } from 'yargs'
import fs from 'fs'
import { USER_TOKEN_CONFIG_KEY } from './constants'
import { initStore, printRed } from './support'


export default {
    command: 'login',
    describe: 'Logins to cli',
    builder: (argv: Argv) => {
        argv.positional('token', {
            type: 'string',
            default: '',
            required: true,
            description: 'The github token to use for login'
        })
    },
    handler: async (argv) => {
        const store = initStore()
        const token = argv['token']
        if (!token) {
            printRed('please provide a token')
            return
        }
        store.set(USER_TOKEN_CONFIG_KEY, token)
        console.log(`Welcome back`)
    }
} // as CommandModule
