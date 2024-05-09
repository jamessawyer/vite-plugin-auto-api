const mm = require('micromatch')

// console.log(mm(['/src/api/math.ts'], [ './src/api/**/*.ts', '!./src/api/index.ts' ] ))
console.log(mm.isMatch('/src/api/test.ts', [ '/src/api/**/*.ts' ] ))

// console.log(mm(['a.js', 'a.txt'], ['*.js']));