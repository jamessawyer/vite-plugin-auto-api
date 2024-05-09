import { Plugin } from 'vite'
import { EOL } from 'node:os'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import fg from 'fast-glob'
import mm from 'micromatch'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('__filename', __filename)
console.log('__dirname', __dirname)

const RootPath = './src/api'
const Target = '__auto_api_target_'
const $service = {}

function formatService(obj: Record<string, any>, remainPathGroup: string[], idx: number) {
    // console.log('---- obj ----', obj)
    // console.log('---- remainPathGroup ----', remainPathGroup)
    if (remainPathGroup.length === 1) {
        // console.log('obj', obj)
        obj[remainPathGroup[0]] = Target + idx
    } else {
        obj[remainPathGroup[0]] = obj[remainPathGroup[0]] ?? {}
        formatService(obj[remainPathGroup[0]], remainPathGroup.slice(1), idx)
    }
}

interface Option {
    rootPath?: string
    target?: string[]
    extension?: string
}


export default function autoApiPlugin(option: Option = { rootPath: RootPath, target: ['./src/api/**/*.ts', '!./src/api/index.ts'], extension: '.ts' }): Plugin {
    return {
        name: 'vite-plugin-auto-api',
        enforce: 'pre',
        config(config, env) {
            const files = fg.globSync(option.target!)
            // console.log('files', files)
            if (files?.length < 0) return
            let code = ''
            files.map(filePath => filePath.replace(option.rootPath!, '')).forEach((filePath, idx) => {
                const fileWithoutExt = filePath.replace(option.extension!, '')
                // 移除 /index
                const finalPath = fileWithoutExt.endsWith('index') ? fileWithoutExt.slice(0, -6) : fileWithoutExt
                code += `import * as ${Target}${idx} from '.${finalPath}'${EOL}`
                // console.log('filePath', filePath)
                const remainPathGroup = filePath.slice(1).replace(option.extension!, '').split('/')
                // console.log('remainPathGroup', remainPathGroup)
                formatService($service, remainPathGroup, idx)
            })
            // console.log('$service', `${JSON.stringify($service).replace(/"index":"/g, '').replace(/"/g, '').replace(/(__auto_api_target_[\d])/g, '...$1').replace(/(?<=:)(...__auto_api_target_[\d])/g, '{$1}')}`)
            const finalService = `${JSON.stringify($service).replace(/"index":"/g, '').replace(/"/g, '').replace(/(__auto_api_target_[\d])/g, '...$1').replace(/(?<=:)(...__auto_api_target_[\d])/g, '{$1}')}`
            // const finalService = `${JSON.stringify($service).replace(/"index":"/g, '').replace(/"/g, '').replace(/(__auto_api_target_[\d])/g, '...$1').replace(/{{/g, '{').replace(/}}/g, '}')}`
            // console.log('finalService', finalService)
            code += `${EOL}export default ${finalService};`
            fs.writeFileSync(option.rootPath! + '/index.ts', code)
        },
        configureServer(server) {
            
            const files = fg.globSync(option.target!)
            files.forEach(filePath => {
                server.watcher.add(filePath)
            })

            function handleWatcher(file: string) {
                console.log('file change', file)
                const dirname = path.dirname(file)
                // const relativePath = path.relative(file, __dirname)
                const changedFile = file.replace(__dirname, '')
                console.log('option.target!', option.target!.map(el => el.startsWith('.') ? el.slice(1) : el ))
                console.log('changedFile', changedFile)

                // const isTargetDir = micromatch(option.target!, [changedFile])
                const isMatched = mm.isMatch(changedFile.startsWith('/') ? changedFile : '/' + changedFile, option.target!.map(el =>  el.startsWith('.') ? el.slice(1) : el ).filter(el => !el.startsWith('!')), {})
                console.log('isMatched', isMatched)
                if (isMatched) {
                    // 匹配上了
                    server.restart()
                }

                console.log('dirname', dirname)
                // console.log('relativePath', relativePath)
            }

            // server.watcher.on('change', handleWatcher)
            server.watcher.on('add', handleWatcher)
            server.watcher.on('unlink', handleWatcher)
        }
    }
}
