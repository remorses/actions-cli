#!/usr/bin/env node
import yargs from 'yargs'
import winston from 'winston'
import loginCommand from './login'
import logoutCommand from './logout'
import { winstonConf } from './support'
import FetchCommand from './fetch'

yargs
    .option('verbose', {
        alias: 'v',
        type: 'boolean',
        default: false,
    })
    .middleware([
        (argv) => {
            if (argv.verbose) {
                winston.configure({
                    ...winstonConf,
                    level: 'debug',
                })
                return
            }
            winston.configure({ ...winstonConf, silent: true, level: 'error' })
        },
    ])
    .command(loginCommand as any)
    .command(logoutCommand as any)
    .command(FetchCommand as any)
    // .demandCommand()
    .help('h').argv
