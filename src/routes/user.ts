import * as Koa from 'koa'
import { get, post, middlewares } from '../utils/route-decors'
import model from '../model/user'
import * as validate from 'validate.js'
import Schema from 'async-validator'

const users = [{ name: 'Chiu', age: 29 }]

const validator = rule => (target, propertyKey, descriptor) => {
  const oldVal = descriptor.value

  descriptor.value = async function(
    ctx: Koa.Context,
    next: () => Promise<any>
  ) {
    const schema = new Schema(rule)
    let err
    try {
      // await validate.async(ctx.request.body, rule)
      await schema.validate(ctx.request.body)
    } catch (error) {
      console.log(error)
      // err = Object.keys(error)[0] ? error : '服务器出错'
      err = Object.keys(error)[0] ? error.errors[0].message : '服务器出错'
    }
    if (err) {
      ctx.body = { ok: false, err }
    } else {
      return oldVal.apply(null, arguments)
    }
  }

  return descriptor
}

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
  @get('/users')
  public async list(ctx: Koa.Context) {
    // ctx.body = { ok: 1, data: users }
    const users = await model.findAll()
    ctx.body = { ok: 1, users }
  }

  //   @validator({
  //     name: {
  //       presence: {
  //         allowEmpty: false,
  //         message: 'is required'
  //       }
  //     }
  //   })
  @validator({
    name: [{ required: true, message: '请输入用户名' }]
  })
  @post('/users')
  public add(ctx: Koa.Context) {
    users.push(ctx.request.body)
    ctx.body = { ok: 1 }
  }
}
