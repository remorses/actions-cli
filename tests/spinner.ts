import ora from 'ora'
import Multispinner from 'multispinner'
import { sleep, printRed } from '../src/support'
import { addSpinner } from '../src/fetch'

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
    let xs = new Multispinner({ a: 'x', b: 'y' }, {})
    await sleep(1000)
    xs.success('a')
    await sleep(1000)
})
it('multiple multispinner', async () => {
    let xs = new Multispinner({ a: 'x', b: 'y' }, {})
    let ys = new Multispinner({ a: 'a', b: 'b' }, {})
    await sleep(1000)
    xs.success('a')
    await sleep(1000)
})
it('addSpinner', async () => {
    let xs = new Multispinner({ a: 'x', b: 'y' }, {})
    await sleep(1000)
    xs.success('a')
    addSpinner({ spinners: xs, key: 'z', value: 'z' })
    await sleep(1000)
    printRed('ciao')
})
