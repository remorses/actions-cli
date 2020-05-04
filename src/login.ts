import yargs, { CommandModule, Argv } from 'yargs'
import { loginOnLocalhost } from 'cli-social-login'
import fs from 'fs'
import { USER_TOKEN_CONFIG_KEY, firebaseConfig } from './constants'
import { initStore, printRed } from './support'

export default {
    command: 'login',
    describe: 'Logins to cli',
    builder: (argv: Argv) => {},
    handler: async (argv) => {
        const store = initStore()

        // starts a server on localhost to login the user
        const { credentials, user } = await loginOnLocalhost({
            firebaseConfig,
            providers: ['github'],
            scopes: {
                github: ['notifications', 'repo'],
            },
            port: 3000, // default sto random port
        })
        const githubToken = credentials.oauthAccessToken
        store.set(USER_TOKEN_CONFIG_KEY, githubToken)
        console.log(`Saved Token`)
    },
} // as CommandModule
