import { getRepoInfo, getLastCommit } from '../src/fetch'
import { strict as assert } from 'assert'
import { Octokit } from '@octokit/rest'

it('ready', () => {
    assert.ok(true)
})
it('getLastCommit', async () => {
    const cwd = process.cwd()
    const res = await getLastCommit({
        ...await getRepoInfo(cwd),
        cwd,
        octokit: new Octokit(),
    })
    console.log(res)
})
