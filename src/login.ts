import yargs, { CommandModule, Argv } from 'yargs'
import { loginOnLocalhost } from 'cli-social-login'
import fs from 'fs'
import { USER_TOKEN_CONFIG_KEY, firebaseConfig } from './constants'
import { initStore, printRed } from './support'

const welcomeMessage =
    'Run `actions-cli` to see the actions status for the current commit'

export default {
    command: 'login',
    describe: 'Logins to cli',
    builder: (argv: Argv) => {
        argv.option('token', {
            type: 'string',
            default: '',
            description:
                "Pass the token directly, necessary if you can't login via localhost and browser",
        })
    },
    handler: async (argv) => {
        const store = initStore()
        if (argv.token) {
            store.set(USER_TOKEN_CONFIG_KEY, argv.token)
            console.log(`Token Saved`)
            console.log(welcomeMessage)
            return
        }
        // starts a server on localhost to login the user
        const { credentials, user } = await loginOnLocalhost({
            firebaseConfig,
            providers: ['github'],
            scopes: {
                github: ['notifications', 'repo'],
            },
        })
        const githubToken = credentials.oauthAccessToken
        if (!githubToken) {
            printRed('cannot get token')
            return
        }
        store.set(USER_TOKEN_CONFIG_KEY, githubToken)
        console.log(`Token Saved`)
        console.log(welcomeMessage)
    },
} // as CommandModule
