import { RestEndpointMethodTypes } from '@octokit/rest'
import to from 'await-to-js'
import chalk from 'chalk'
import { execSync } from 'child_process'
import { dots as cliSpinner } from 'cli-spinners'
import getRepoUrl from 'git-remote-origin-url'
import * as logSymbols from 'log-symbols'
import Multispinner from 'multispinner'
import ora from 'ora'
import path from 'path'
import { Argv } from 'yargs'
import {
    initOctokit,
    parseGithubUrl,
    printGreen,
    printRed,
    sleep
} from './support'

const DEBUG = process.env.DEBUG

const FetchCommand = {
    command: '$0',
    describe: 'Fetch the current hash job status and logs',
    builder: (argv: Argv) => {
        argv.positional('path', {
            type: 'string',
            default: '',
            required: true,
            description: 'The github repo path'
        })
    },
    handler: async (argv) => {
        const octokit = initOctokit()
        const currentPath = path.resolve(argv.path || process.cwd())
        let [error, gitRepoUrl] = await to(getRepoUrl(currentPath))
        if (error || !gitRepoUrl) {
            console.log(
                'cannot find git origin url, skipping github integration',
                error
            )
            gitRepoUrl = ''
        }
        const lastPushedSha = getLastPushedCommitSha()
        const { name: repo, owner } = parseGithubUrl(gitRepoUrl)

        const spinner = ora('fetching state').start()
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
                changeSpinnertext({ spinner, text: 'waiting for queue' })
                await sleep(3000)
                continue
            }

            const { head_sha, status, id, conclusion, url, html_url } = lastRun
            // console.log(
            //     'unexpected values',
            //     JSON.stringify({ head_sha, status, id, conclusion }, null, 4)
            // )
            if (status === 'queued') {
                changeSpinnertext({ spinner, text: 'queued' })
                await sleep(3000)
                continue
            }
            if (status === 'in_progress') {
                changeSpinnertext({ spinner, text: 'in progress' })
                spinner.stop()
                await pollJobs({ repo, owner, id })
                return
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
                'unexpected state',
                JSON.stringify({ head_sha, status, id, conclusion }, null, 4)
            )
            spinner.fail('Wtf?')
            return
        }
    }
} // as CommandModule

export default FetchCommand

export async function pollJobs({ owner, repo, id }) {
    const octokit = initOctokit()
    let spinners = null
    while (true) {
        const data = await octokit.actions.listJobsForWorkflowRun({
            owner,
            repo,
            run_id: id
        })
        // TODO all jobs
        const job = data.data.jobs[0]
        if (
            spinners === null
            // Object.keys(spinners.spinners).length !== job.steps.length
        ) {
            const obj = Object.assign(
                {},
                ...job.steps.map((x) => ({
                    [x.number]: x.name
                }))
            )
            spinners = new Multispinner(obj, {
                clear: false,
                ...cliSpinner
            })
            DEBUG && console.log(JSON.stringify(job, null, 4))
        }
        displayJobsTree({ spinners, job })
        if (job.status !== 'completed') {
            await sleep(2000)
            continue
        }
        if (job.conclusion === 'failure') {
            job.steps.forEach((step) => {
                const spinner = spinners.spinners[step.number]
                if (spinner && spinner.state === 'incomplete') {
                    spinners.error(step.number)
                }
            })
        }

        if (job.conclusion === 'failure') {
            printRed(
                `${logSymbols.error} Failed, read the logs at '${job.html_url}'`
            )
            return
        }
        if (job.conclusion === 'success') {
            printGreen(`${logSymbols.success} Success`)
            return
        }
        DEBUG && console.log(JSON.stringify(job, null, 4))
        console.log(job.conclusion)
        return
    }
}

export function displayJobsTree({
    job = null as RestEndpointMethodTypes['actions']['listJobsForWorkflowRun']['response']['data']['jobs'][0],
    spinners
}) {
    // console.log(JSON.stringify(job, null, 4))
    for (let step of job.steps) {
        try {
            if (
                !Object.keys(spinners.spinners).includes(step.number.toString())
            ) {
                continue
            }
            if (step.status === 'queued') {
                // spinner.info(step.name)
                // return { ok: true }
            }
            if (step.status === 'in_progress') {
                // spinner.info(step.name)
                // spinners.success(step.number)
                // return { ok: true }
            }
            if (step.status === 'completed') {
                if (step.conclusion === 'success') {
                    // spinner.info(step.name)
                    spinners.success(step.number)
                    // return { ok: true, completed: true }
                }
                if (step.conclusion === 'failure') {
                    spinners.error(step.number)
                    // return { ok: false, completed: true }
                }
            }
        } catch (e) {
            // console.log('wtf', step)
            console.log(JSON.stringify(job, null, 4))
            console.error(step.name, step.number, e)
        }
    }
}

function getLastPushedCommitSha(): string {
    const sha = execSync('git rev-parse HEAD')
        .toString()
        .trim()
    return sha
}

function changeSpinnertext({ spinner, text }) {
    if (spinner.text !== text) {
        spinner.info()
    }
    spinner.start(text)
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
