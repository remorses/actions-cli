import { isCommitFromActions, getRepoInfo } from '../src/fetch'
import { strict as assert } from 'assert'

it('ready', () => {
    assert.ok(true)
})
it('isCommitFromActions', async () => {
    const fromAciton = await isCommitFromActions({
        ...(await getRepoInfo(process.cwd())),
        sha: '0a8232693386bc9a6aff4192459ba142cccc1ad5',
    })
})
