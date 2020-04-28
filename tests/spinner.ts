import ora from 'ora'
import { sleep } from '../src/support'

it('spinner', async () => {
    let spinner = ora('xxx').start()
    await sleep(1000)
    spinner.info()
    spinner.start('ciao')
    await sleep(1000)
    spinner.info()
    spinner.start('bye')
})
