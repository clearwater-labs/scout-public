const app = require('../server')
const supertest = require('supertest')
const request = supertest(app)
const hasPermissions = require('./users').hasPermissions
var token

const testUsername = "testUser"
const testPassword = "update"

beforeAll((done) => {
    // get the token for a user
    request.post('/users/login/basic')
        .send({ email: "admin", password: "123" })
        .end((err, res) => {
            token = res.body.token
            done()
        })
})

describe('/users routes are authenticated', () => {
    it('/all', async done => {
        const res = await request.get('/users/all')
        expect(res.status).toBe(401)
        done()
    })

    it('/verify', async done => {
        const res = await request.post('/users/verify')
        expect(res.status).toBe(401)
        done()
    })

    it('/login/ldap', async done => {
        const res = await request.post('/users/verify')
        expect(res.status).toBe(401)
        done()
    })
})

describe('POST /create', () => {
    it('empty body -> 400', async done => {
        const res = await request.post('/users/create')
            .send({})
        expect(res.status).toBe(400)
        done()
    })

    it('missing email -> 400', async done => {
        const res = await request.post('/users/create')
            .send({ password: testPassword, register_pin: '123' })
        expect(res.status).toBe(400)
        done()
    })

    it('missing password -> 400', async done => {
        const res = await request.post('/users/create')
            .send({ email: testUsername, register_pin: '123' })
        expect(res.status).toBe(400)
        done()
    })

    it('missing pin -> 400', async done => {
        const res = await request.post('/users/create')
            .send({ email: testUsername, password: testPassword })
        expect(res.status).toBe(400)
        done()
    })

    it('incorrect pin -> 401', async done => {
        const res = await request.post('/users/create')
            .send({ email: testUsername, password: testPassword, register_pin: 'wrongpin' })
        expect(res.status).toBe(401)
        done()
    })

    it('creates a user -> 201', async done => {
        const res = await request.post('/users/create')
            .send({ email: testUsername, password: testPassword, register_pin: '123' })
        expect(res.status).toBe(201)
        done()
    })

    it('creates dup user -> 409', async done => {
        const res = await request.post('/users/create')
            .send({ email: testUsername, password: testPassword, register_pin: '123' })
        expect(res.status).toBe(409)
        done()
    })
})

describe('POST /login/basic', () => {
    it('empty body -> 400', async done => {
        const res = await request.post('/users/login/basic')
            .send({})
        expect(res.status).toBe(400)
        done()
    })

    it('missing email -> 400', async done => {
        const res = await request.post('/users/login/basic')
            .send({ password: testPassword })
        expect(res.status).toBe(400)
        done()
    })

    it('missing password -> 400', async done => {
        const res = await request.post('/users/login/basic')
            .send({ email: testUsername })
        expect(res.status).toBe(400)
        done()
    })

    it('missing password -> 400', async done => {
        const res = await request.post('/users/login/basic')
            .send({ email: testUsername })
        expect(res.status).toBe(400)
        done()
    })

    it('incorrect password -> 401', async done => {
        const res = await request.post('/users/login/basic')
            .send({ email: testUsername, password: 'wrongpassword' })
        expect(res.status).toBe(401)
        done()
    })

    it('correct login -> 200', async done => {
        const res = await request.post('/users/login/basic')
            .send({ email: testUsername, password: testPassword })
        expect(res.status).toBe(200)
        done()
    })
})

describe('POST /verify', () => {
    it('empty body -> 400', async done => {
        const res = await request.post('/users/verify')
            .send({})
        expect(res.status).toBe(400)
        done()
    })

    it('missing password -> 400', async done => {
        const res = await request.post('/users/verify')
            .send({ password: testPassword })
        expect(res.status).toBe(400)
        done()
    })
})