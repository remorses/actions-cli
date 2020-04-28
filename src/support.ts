import Conf from 'conf'
import _parseGithubUrl from 'parse-github-url'

import chalk from 'chalk'
import path from 'path'
import { APP_DATA_PATH, USER_TOKEN_CONFIG_KEY } from './constants'
import winston from 'winston'
import { LoggerOptions } from 'winston'
import { Octokit } from '@octokit/rest'

let conf
export function initStore(): Conf {
    if (!conf) {
        conf = new Conf({ cwd: APP_DATA_PATH })
    }
    return conf
}

const { format, transports } = winston

const logFormat = format.printf((info) => {
    const msg =
        typeof info.message === 'object'
            ? JSON.stringify(info.message, null, 4)
            : info.message
    return `${info.timestamp} ${msg}`
})

export const winstonConf: LoggerOptions = {
    format: format.combine(
        format.label({
            label: path.basename(
                (process.mainModule && process.mainModule.filename) || '',
            ),
        }),
        format.timestamp({ format: 'YYYY-MM-DD HH' }),
        // Format the metadata object
        format.metadata({
            fillExcept: ['message', 'level', 'timestamp', 'label'],
        }),
    ),
    transports: [
        new transports.Console({
            format: format.combine(format.colorize({}), logFormat),
        }),
    ],
}

export const print = console.log
export const printRed = (x) => console.log(chalk.red(x))
export const printGreen = (x) => console.log(chalk.green(x))

export function getGithubToken() {
    const store = initStore()
    const token = store.get(USER_TOKEN_CONFIG_KEY)
    // console.log(token)
    if (!token) {
        printRed('cannot find github token, run `login <token>` command first')
        process.exit(1)
    }
    return token
}

export function initOctokit(): Octokit {
    const token = getGithubToken()
    const octokit = new Octokit({ auth: token })
    return octokit
}

export function parseGithubUrl(githubUrl): { name; owner } {
    if (!githubUrl) {
        throw new Error(`cannot parse null github url `)
    }
    const parsedUrl = _parseGithubUrl(githubUrl)
    if (!parsedUrl) {
        throw new Error('cannot parse github url ' + githubUrl)
    }
    const { owner, name: repo } = parsedUrl
    if (!owner || !repo) {
        throw new Error('cannot parse github url ' + githubUrl)
    }
    return parsedUrl
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function catchAll(fun) {
    return async (...args) => {
        try {
            return await fun(...args)
        } catch (e) {
            console.log()
            printRed(e)
            if (process.env.DEBUG) console.log(e)
            process.exit(1)
        }
    }
}
