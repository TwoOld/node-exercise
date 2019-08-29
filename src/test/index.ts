!new Promise(resolve => {
  console.log('resolve')
  resolve()
}).then(() => console.log('promise then..'))

setImmediate(() => {
  console.log('immediate')
})
setTimeout(() => {
  console.log('setTimeout')
}, 0)

process.nextTick(() => {
  console.log('nextTick')
})
