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
      //   await validate
      //     .async(
      //       {
      //         ...ctx.request.query,
      //         ...ctx.request.body
      //       },
      //       rule
      //     )
      //     .catch(error => {
      //       err = error[Object.keys(error)[0]][0]
      //       ctx.body = { ok: false, err }
      //     })
      await schema
        .validate({
          ...ctx.request.query,
          ...ctx.request.body
        })
        .catch(error => {
          err = error.errors[0].message
          ctx.body = { ok: false, err }
        })
    } catch (error) {
      throw error
    }

    if (!err) {
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
  @get('/users/info')
  public add(ctx: Koa.Context) {
    users.push(ctx.request.body)
    ctx.body = { ok: 1 }
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
  public addP(ctx: Koa.Context) {
    users.push(ctx.request.body)
    ctx.body = { ok: 1 }
  }
}
