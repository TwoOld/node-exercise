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

export const middlewares = function middlewares(middlewares: Koa.Middleware) {
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

const method = method => (path: string, options: RouteOptions = {}) =>
  decorate(method, path, router, options)

export const get = method('get')

export const post = method('post')
