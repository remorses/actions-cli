import ora from 'ora'
import Multispinner from 'multispinner'
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
it('multispinner', async () => {
    let xs = new Multispinner({a: 'x', b: 'y'}, {  })
    await sleep(1000)
    xs.success('a')
    await sleep(1000)
})
