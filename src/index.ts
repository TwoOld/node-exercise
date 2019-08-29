import * as Koa from 'koa'
import * as bodify from 'koa-body'
import * as serve from 'koa-static'
import * as timing from 'koa-xtime'
import { load } from './utils/route-decors'
import { resolve } from 'path'
import { Sequelize } from 'sequelize-typescript'

const app = new Koa()

const router = load(resolve(__dirname, './routes'))

const database = new Sequelize({
  port: 3306,
  database: 'arch',
  username: 'root',
  password: 'example',
  dialect: 'mysql',
  modelPaths: [`${__dirname}/model`]
})

database.sync({ force: true })

app.use(timing())
app.use(serve(`${__dirname}/public`))
app.use(
  bodify({
    multipart: true,
    strict: false // 使用非严格模式，解析delete请求的请求体
  })
)

app.use(router.routes())

// app.use((ctx: Koa.Context) => {
//   ctx.body = 'hi ts'
// })

app.listen(3000, () => {
  console.log('server listening at 3000')

  !new Promise(resolve => {
    console.log('resolve1')
    resolve()
  }).then(() => console.log('promise then..1'))

  setImmediate(() => {
    console.log('immediate')
  })
  setTimeout(() => {
    console.log('setTimeout')
  }, 0)

  process.nextTick(() => {
    console.log('nextTick')
    !new Promise(resolve => {
      console.log('resolve2')
      resolve()
    }).then(() => console.log('promise then..2'))
  })
})
