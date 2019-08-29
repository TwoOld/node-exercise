# 目标

- TS 实现类装饰器和方法装饰器
- 搭建 Node TS 开发环境
- 基于装饰器的 Router Validation Models

# 项目结构

1. package.json 创建：`npm init -y`
2. 开发依赖安装： `npm i typescript ts-node-dev tslint @types/node -D`
3. 启动脚本

   ```json
   {
     "scripts": {
       "start": "ts-node-dev ./src/index.ts -P tsconfig.json --no-cache",
       "build": "tsc -P tsconfig.json && node ./dist/index.js",
       "tslint": "tslint --fix -p tsconfig.json"
     }
   }
   ```

4. 加入 tsconfig.json

   ```json
   {
     "compilerOptions": {
       "outDir": "./dist",
       "target": "es2017",
       "module": "commonjs",
       "sourceMap": true,
       "moduleResolution": "node",
       "experimentalDecorators": true,
       "allowSyntheticDefaultImports": true,
       "lib": ["es2015"],
       "typeRoots": ["./node_modules/@types"],
       "types": ["koa-body"]
     },
     "include": ["src/**/*"]
   }
   ```

5. 创建入口文件 src/index.ts
6. 运行测试 `npm start`

## 项目基础代码

1. 安装依赖：`npm i koa koa-static koa-body koa-xtime -S`
2. 编写基础代码 src/index.ts

   ```ts
   import * as Koa from 'koa'
   import * as bodify from 'koa-body'
   import * as serve from 'koa-static'
   import * as timing from 'koa-xtime'

   const app = new Koa()
   app.use(timing())
   app.use(serve(`${__dirname}/public`))
   app.use(
     bodify({
       multipart: true,
       strict: false
     })
   )

   app.use((ctx: Koa.Context) => {
     ctx.body = 'hi ts'
   })

   app.listen(3000, () => {
     console.log('server listening at 3000')
   })
   ```

3. 测试 `npm stat`

## 路由定义及发现

1. 创建路由 src/routes/user.ts

   ```ts
   import * as Koa from 'koa'

   const users = [{ name: 'Chiu', age: 29 }]

   export default class User {
     @get('/users')
     public list(ctx: Koa.Context) {
       ctx.body = { ok: 1, data: users }
     }

     @post('/users')
     public add(ctx: Koa.Context) {
       users.push(ctx.request.body)
       ctx.body = { ok: 1 }
     }
   }
   ```

   > 另外两个问题需要解决
   >
   > 1. 路由发现
   > 2. 路由注册

2. 路由发现及注册，创建 utils/route-decors.ts

   ```ts
   import * as glob from 'glob'
   import * as Koa from 'koa'
   import * as KoaRouter from 'koa-router'

   type HTTPMethod = 'get' | 'put' | 'del' | 'post' | 'patch'

   type LoadOptions = {
     /**
      * 路由文件扩展名，默认值是`.{js,ts}`
      */
     extname?: string
   }

   type RouteOptions = {
     /**
      * 适用于某个请求比较特殊，需要单独制定前缀的情形
      */
     prefix?: string
     /**
      * 给当前路由添加一个或多个中间件
      */
     middlewares?: Array<Koa.Middleware>
   }

   const router = new KoaRouter()
   export const load = (folder: string, options: LoadOptions = {}) => {
     const extname = options.extname || '.{js,ts}'
     glob
       .sync(require('path').join(folder, `./**/*${extname}`))
       .forEach(f => require(f))

     return router
   }

   const decorate = (
     method: HTTPMethod,
     path: string,
     router: KoaRouter,
     options: RouteOptions = {}
   ) => {
     return (target, propertyKey) => {
       const url = options && options.prefix ? options.prefix + path : path
       router[method](url, target[propertyKey])
     }
   }

   const method = method => (path: string, options: RouteOptions = {}) =>
     decorate(method, path, router, options)

   export const get = method('get')

   export const post = method('post')
   ```

3. 使用

   routes/user.ts

   ```ts
   import { get, post } from '../utils/route-decors'
   ```

   index.ts

   ```ts
   import { load } from './utils/route-decors'
   import { resolve } from 'path'

   const router = load(resolve(__dirname, './routes'))

   app.use(router.routes())
   ```

4. 数据校验：可以利用中间件机制实现

   添加校验函数 routes/user.ts

   ```ts
   import * as Koa from 'koa'
   import { get, post, middlewares } from '../utils/route-decors'

   const users = [{ name: 'Chiu', age: 29 }]

   @middlewares([
     async function guard(ctx: Koa.Context, next: () => Promise<any>) {
       console.log('guard', ctx.header)
       if (ctx.header.token) {
         await next()
       } else {
         throw 'please login'
       }
     }
   ])
   export default class User {
     @post('/users', {
       middlewares: [
         async function validation(ctx: Koa.Context, next: () => Promise<any>) {
           // 用户名必须输入
           const name = ctx.request.body.name
           if (!name) {
             throw '请输入用户名'
           }
           await next()
         }
       ]
     })
     public add(ctx: Koa.Context) {
       users.push(ctx.request.body)
       ctx.body = { ok: 1 }
     }
   }
   ```

   修改 utils/route-decors.ts

   ```ts
   export const middlewares = function middlewares(
     middlewares: Koa.Middleware
   ) {
     return function(target) {
       target.prototype.middlewares = middlewares
     }
   }

   const decorate = (
     method: HTTPMethod,
     path: string,
     router: KoaRouter,
     options: RouteOptions = {}
   ) => {
     return (target, propertyKey) => {
       process.nextTick(() => {
         // 添加中间件
         const middlewares = []
         if (target.middlewares) {
           middlewares.push(...target.middlewares)
         }
         if (options.middlewares) {
           middlewares.push(...options.middlewares)
         }
         middlewares.push(target[propertyKey])

         const url = options && options.prefix ? options.prefix + path : path
         router[method](url, ...middlewares)
       })
     }
   }
   ```

## 数据库整合

1. 安装依赖：`npm i -S sequelize sequelize-typescript reflect-metadata mysql2`

2. 初始化 修改 index.ts

   ```ts
   import { Sequelize } from 'sequelize-typescript'

   const database = new Sequelize({
     port: 3306,
     database: 'arch',
     username: 'root',
     password: 'example',
     dialect: 'mysql',
     modelPaths: [`${__dirname}/model`]
   })

   database.sync({ force: true })
   ```

3. 创建模型

   model/user.ts

   ```ts
   import { Table, Column, Model, DataType } from 'sequelize-typescript'

   @Table({ modelName: 'users' })
   export default class User extends Model<User> {
     @Column({
       primaryKey: true,
       autoIncrement: true,
       type: DataType.INTEGER
     })
     public id: number

     @Column(DataType.CHAR)
     public name: string
   }
   ```

4. 使用 修改 routes/user.ts

   ```ts
   import model from '../model/user'

   export default class User {
     @get('/users')
     public async list(ctx: Koa.Context) {
       // ctx.body = { ok: 1, data: users }
       const users = await model.findAll()
       ctx.body = { ok: 1, users }
     }
   }
   ```

## TypeScript

- 类
- 接口
- 模块
- 类型注解 Type annotation
- 编译时类型检查
- 箭头函数

## 装饰器

运行方法

```shell
npm i
npm start
```

概念介绍
