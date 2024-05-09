import { EOL } from 'node:os'
import { Plugin } from 'vite'
import * as fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import fg from 'fast-glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('__filename', __filename)
console.log('__dirname', __dirname)

const RootPath = './src/api'
const Target = '__auto_api_target_'
const $service = {}

function formatService(obj: Record<string, any>, remainPathGroup: string[], idx: number) {
    if (remainPathGroup.length === 1) {
        console.log('obj', obj)
        obj[remainPathGroup[0]] = Target + idx
    } else {
        obj[remainPathGroup[0]] = obj[remainPathGroup[0]] ?? {}
        formatService(obj[remainPathGroup[0]], remainPathGroup.slice(1), idx)
    }
}

interface Option {
    rootPath?: string
    target?: string | string[]
    extension?: string
}


export default function autoApiPlugin(option: Option = { rootPath: RootPath, target: ['./src/api/**/*.ts', '!./src/api/index.ts'], extension: '.ts' }): Plugin {
    return {
        name: 'autoApiPlugin',
        enforce: 'pre',
        config(config, env) {
            const files = fg.globSync(['./src/api/**/*.ts', '!./src/api/index.ts'])
            // console.log('files', files)
            if (files?.length < 0) return
            let code = ''
            files.map(filePath => filePath.replace(RootPath, '')).forEach((filePath, idx) => {

                code += `import * as ${Target}${idx} from '.${filePath}';${EOL}`
                console.log('filePath', filePath)
                const remainPath = filePath.slice(1).replace('.ts', '')
                const remainPathGroup = remainPath.split('/')
                console.log('remainPathGroup', remainPathGroup)
                formatService($service, remainPathGroup, idx)
            })
            console.log('$service', $service)
            const finalService = `${JSON.stringify($service).replace("\"index\":", '').replace(/"/g, '').replace(/(__auto_api_target_[\d])/g, '{...$1}').replace(/{{/g, '{').replace(/}}/, '}')}`
            console.log('finalService', finalService)
            code += `${EOL}export default ${finalService};`
            fs.writeFileSync(RootPath + '/index.ts', code)
        },
        configResolved(config) {
            // console.log('config', config)
        },
        configureServer(server) {
            const files = fg.globSync(['./src/api/**/*.ts', '!./src/api/index.ts'])
            files.forEach(filePath => {
                server.watcher.add(filePath)
            })

            function handleWatcher() {
                server.restart()
            }

            server.watcher.on('change', handleWatcher)
            server.watcher.on('add', handleWatcher)
            server.watcher.on('unlink', handleWatcher)
        }
    }
}


// import * as target1 from './src/api'
// const $service = {env:}
