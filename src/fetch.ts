import yargs, { CommandModule } from 'yargs'
import fetch from 'node-fetch'
import ora from 'ora'
import getRepoUrl from 'git-remote-origin-url'
import to from 'await-to-js'

import fs from 'fs'
import { USER_TOKEN_CONFIG_KEY } from './constants'
import {
    initStore,
    printRed,
    getGithubToken,
    parseGithubUrl,
    printGreen,
    print,
    sleep,
    initOctokit
} from './support'
import { Octokit } from '@octokit/rest'
import { execSync } from 'child_process'
import chalk from 'chalk'

const FetchCommand = {
    command: '$0',
    describe: 'Fetch the current hash job status and logs',
    builder: (argv) => {
        // argv.option('token', {
        //     type: 'string',
        //     default: '',
        //     required: true,
        //     description: 'The github token to use for login'
        // })
    },
    handler: async (argv) => {
        const octokit = initOctokit()
        let [error, gitRepoUrl] = await to(getRepoUrl(process.cwd()))
        if (error || !gitRepoUrl) {
            console.log(
                'cannot find git origin url, skipping github integration',
                error
            )
            gitRepoUrl = ''
        }
        const lastPushedSha = getLastPushedCommitSha()
        const { name: repo, owner } = parseGithubUrl(gitRepoUrl)

        const spinner = ora('').start()
        while (true) {
            const data = await octokit.actions.listRepoWorkflowRuns({
                owner,
                repo
            })
            const lastRun = data.data.workflow_runs.find((x) => {
                const { head_sha, status, id, conclusion } = x

                if (head_sha === lastPushedSha) {
                    // console.log('found')
                    return true
                }
                return false
            })
            if (!lastRun) {
                spinner.text = 'waiting for queue'
                await sleep(3000)
                continue
            }

            const { head_sha, status, id, conclusion, url, html_url } = lastRun
            // console.log(
            //     'unexpected values',
            //     JSON.stringify({ head_sha, status, id, conclusion }, null, 4)
            // )
            if (status === 'queued') {
                spinner.text = 'queued'
                await sleep(3000)
                continue
            }
            if (status === 'in_progress') {
                spinner.text = 'in progress'
                await sleep(3000)
                continue
            }
            if (status === 'completed') {
                if (conclusion === 'success') {
                    spinner.succeed(chalk.green('Success'))
                    return
                }
                if (conclusion === 'failure') {
                    spinner.fail(chalk.red('Failure'))
                    // const data = await octokit.actions.getWorkflow({})
                    printRed(`go to '${html_url}' for the logs`)
                    // print(
                    //     `https://github.com/${owner}/${repo}/runs/${workflowId}?check_suite_focus=true`
                    // )
                    // const logs = await getLogs({ id, repo, owner })
                    // print(logs)
                    return
                }
            }
            console.log(
                'unexpected values',
                JSON.stringify({ head_sha, status, id, conclusion }, null, 4)
            )
            spinner.fail('Wtf?')
            return
        }
    }
} // as CommandModule

export default FetchCommand

function getLastPushedCommitSha(): string {
    const sha = execSync('git rev-parse HEAD')
        .toString()
        .trim()
    return sha
}

async function getLogs({ id, owner, repo }) {
    const octokit = initOctokit()
    const data = await octokit.actions.listWorkflowRunLogs({
        owner,
        repo,
        run_id: id
    })
    console.log(JSON.stringify(data, null, 4))
    const logsUrl = data.url
    // const res = await fetch(logsUrl,)
    // const logs = await res.textConverted()
    return ''
}
