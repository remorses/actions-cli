import memoize from 'memoizee'
import { RestEndpointMethodTypes, Octokit } from '@octokit/rest'
import { flatten } from 'lodash'
import simpleGit from 'simple-git/promise'
import to from 'await-to-js'
import chalk from 'chalk'
import { execSync } from 'child_process'
import { dots as cliSpinner } from 'cli-spinners'
import getRepoUrl from 'git-remote-origin-url'
import * as logSymbols from 'log-symbols'
import Multispinner from 'multispinner'
import Spinners from 'multispinner/lib/spinners'
import ora from 'ora'
import logUpdate from 'log-update'
import path from 'path'
import { Argv } from 'yargs'

import {
    initOctokit,
    parseGithubUrl,
    printGreen,
    printRed,
    sleep,
    catchAll,
    print,
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
            description: 'The github repo path',
        })
        argv.option('sha', {
            type: 'string',
            default: '',
            required: true,
            description:
                'The sha to look for actions, at least 7 characters long',
        })
        argv.option('workflow', {
            type: 'string',
            default: '',
            alias: 'w',
            description: 'The workflow file name',
        })
        argv.option('job', {
            type: 'string',
            default: '',
            alias: 'j',
            description: 'The job name, defaults to the first listed job',
        })
        argv.option('non-actions-commit', {
            type: 'boolean',
            default: false,
            alias: 'n',
            description:
                'Double checks that the used sha was not committed by github-actions, only works for recent actions commits',
        })
    },
    handler: catchAll(async (argv) => {
        const octokit = initOctokit()
        const jobToFetch = argv.job
        const skipActionsCheck = !argv['non-actions-commit']
        const workflowToFetch = argv.workflow
        const currentPath = path.resolve(argv.path || process.cwd())
        const { owner, repo } = await getRepoInfo(currentPath)
        const spinner = ora(`getting last commit sha`).start()
        let sha =
            argv.sha ||
            (await getLastCommit({
                octokit,
                owner,
                repo,
                cwd: currentPath,
                skipActionsCheck,
            }))
        const prettySha = sha.slice(0, 7)
        changeSpinnerText({
            text: `fetching state for sha '${prettySha}'`,
            spinner,
        })
        while (true) {
            let workflowRuns = []

            if (workflowToFetch) {
                const [err, data] = await to(
                    octokit.actions.listWorkflowRuns({
                        owner,
                        repo,
                        workflow_id: workflowToFetch,
                    }),
                )
                if (err) {
                    spinner.stop()
                    printRed(`Workflow '${workflowToFetch}' not found`)
                    return
                }
                workflowRuns = data.data.workflow_runs
            } else {
                const data = await octokit.actions.listWorkflowRunsForRepo({
                    owner,
                    repo,
                })
                workflowRuns = data.data.workflow_runs
            }
            const lastRun = workflowRuns.find((x) => {
                const { head_sha, status, id, conclusion, workflow_url } = x
                // console.log({ workflow_url })
                if (head_sha.slice(0, 7) === sha.slice(0, 7)) {
                    // console.log('found')

                    return true
                }
                return false
            })
            if (!lastRun) {
                changeSpinnerText({
                    spinner,
                    text: `waiting job handling last commit '${prettySha}'`,
                })
                await sleep(3000)
                if (!argv.sha) {
                    sha = await getLastCommit({
                        octokit,
                        owner,
                        repo,
                        cwd: currentPath,
                        skipActionsCheck,
                    })
                }
                continue
            }

            const { head_sha, status, id, conclusion, url, html_url } = lastRun
            // console.log(
            //     'unexpected values',
            //     JSON.stringify({ head_sha, status, id, conclusion }, null, 4)
            // )
            if (status === 'queued') {
                changeSpinnerText({ spinner, text: 'queued' })
                await sleep(3000)
                continue
            }
            if (status === 'in_progress') {
                changeSpinnerText({ spinner, text: 'in progress' })
                spinner.info()
                spinner.stop()
                await pollJobs({ repo, owner, id, jobToFetch })
                return
            }
            if (status === 'completed') {
                changeSpinnerText({ spinner, text: 'completed' })
                spinner.info()
                spinner.stop()
                // if (conclusion === 'success') {
                //     spinner.succeed(chalk.green('Success'))
                // }
                // if (conclusion === 'failure') {
                //     spinner.fail(chalk.red('Failure'))
                // }
                await pollJobs({ repo, owner, id, jobToFetch })
                return
            }
            console.log(
                'unexpected state',
                JSON.stringify({ head_sha, status, id, conclusion }, null, 4),
            )
            spinner.fail('Wtf?')
            return
        }
    }),
} // as CommandModule

export default FetchCommand

export async function pollJobs({ owner, repo, id, jobToFetch }) {
    DEBUG && console.log('pollJobs')
    const octokit = initOctokit()
    let spinners = null
    while (true) {
        const data = await octokit.actions.listJobsForWorkflowRun({
            owner,
            repo,
            run_id: id,
        })
        const job = jobToFetch
            ? data.data.jobs.find((job) => {
                  return job.name === jobToFetch
              })
            : data.data.jobs?.[0]
        if (!job) {
            printRed(
                `Job '${jobToFetch}' not found, make sure your yaml is valid`,
            )
            return
        }
        if (
            spinners === null ||
            // if the steps changed during build
            Object.keys(spinners.spinners).length !== job.steps.length
        ) {
            const obj = Object.assign(
                {},
                ...job.steps.map((x) => ({
                    [x.number]: x.name,
                })),
            )
            if (!spinners) {
                // init spinners
                spinners = new Multispinner(obj, {
                    // clear: false,
                    // update: logUpdate,
                    ...cliSpinner,
                })
            } else {
                // add a new spinner
                const spinnersKeys = Object.keys(spinners.spinners)
                Object.keys(obj).map((k) => {
                    if (!spinnersKeys.includes(k)) {
                        addSpinner({ spinners, key: k, value: obj[k] })
                    }
                })
            }
            DEBUG && console.log(JSON.stringify(job, null, 4))
        }
        displayJobsTree({ spinners, job })
        if (job.status !== 'completed') {
            await sleep(2000)
            continue
        }
        spinners.update.clear() // TODO bug on multispinners
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
                `${
                    logSymbols.error
                } Failed, read the logs at ${chalk.whiteBright(job.html_url)}`,
            )
            return
        }
        if (job.conclusion === 'success') {
            printGreen(
                `${
                    logSymbols.success
                } Success, read the logs at ${chalk.whiteBright(job.html_url)}`,
            )
            return
        }
        console.log(JSON.stringify(job, null, 4))
        return
    }
}

export function addSpinner({ spinners, key, value }) {
    spinners.spinners[key] = Spinners.prototype.spinnerObj(value)
}

export function displayJobsTree({
    job = null as RestEndpointMethodTypes['actions']['listJobsForWorkflowRun']['response']['data']['jobs'][0],
    spinners,
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
            throw e
            // console.error(step.name, step.number, e)
        }
    }
}

function changeSpinnerText({ spinner, text }) {
    if (spinner.text !== text) {
        spinner.info()
    }
    spinner.start(text)
}

// export async function isCommitFromActions({ sha, repo, owner }) {
//     const octokit = initOctokit()
//     const data = await octokit.repos.getCommit({ owner, repo, ref: sha })
//     console.log(JSON.stringify(data.data, null, 4))
//     return false
// }

export async function getRepoInfo(currentPath) {
    const gitRepoUrl = await getRepoUrl(currentPath)
    const { name: repo, owner } = parseGithubUrl(gitRepoUrl)
    return { repo, owner }
}

const GITHUB_ACTIONS_BOT_LOGIN = 'github-actions[bot]'

const getRepoCommits = memoize(
    async ({
        octokit,
        owner,
        repo,
    }): Promise<{ actor: string; refs: string[] }[]> => {
        const data = await octokit.activity.listRepoEvents({
            owner,
            repo,
            per_page: 50,
        })
        const commits = data.data
            .filter((event) => {
                return event.type === 'PushEvent'
            })
            .map((event) => {
                return {
                    actor: event.actor.login,
                    refs: event.payload.commits.map((x) => x.sha),
                }
            })
        return commits
    },
)

export async function getLastCommit(args: {
    octokit: Octokit
    owner
    repo
    cwd
    skipActionsCheck
}): Promise<string> {
    if (args.skipActionsCheck) {
        return execSync('git rev-parse HEAD').toString().trim()
    }
    const { owner, repo, octokit } = args
    const git = simpleGit(args.cwd)
    // console.log(JSON.stringify(data.data, null, 4))
    const commits = await getRepoCommits({ owner, repo, octokit })
    const githubActionsCommits: string[] = flatten(
        commits
            .filter((x) => {
                if (process.env.DEBUG) {
                    console.log('commit actor is ' + x.actor)
                }
                return x.actor === GITHUB_ACTIONS_BOT_LOGIN
            })
            .map((x) => x.refs),
    ).map((x) => x.slice(0, 7))
    const lastLocalCommits = await git.log()
    const lastNonActionsCommit = lastLocalCommits.all.find((commit) => {
        return !githubActionsCommits.includes(commit.hash.slice(0, 7))
    })
    // console.log(
    //     '\n' +
    //         cliSpinner.frames[0] +
    //         ` found a non actions commit made from ` +
    //         lastNonActionsCommit.author_name ||
    //         lastNonActionsCommit.author_email,
    // )
    return lastNonActionsCommit.hash
}
