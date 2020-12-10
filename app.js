const express = require('express')
const app = express()
require('dotenv').config()
app.use(express.json())

// libraire joi pour vérifier facilement les infos des students
const table = {
    students: 'students',
    degrees: 'degrees'
}

const knex = require('knex')({
    client: 'pg',
    connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    }
})

const answer = (code, err, data) => ({
    statusCode : code,
    error: err,
    data: data
})

app.get('/students', async function(req, res) {
    knex.select(['id','firstname','lastname','email','created_at'])
        .from(table.students)
        .then(rows => {
            return res.status(200).json(answer(200, null, rows))
        })
        .catch(error => {
            return res.status(500).json(answer(500, error, null))
        })
})

app.post('/students', async function(req, res) {
    let rows
    try {
        rows = await knex.insert(req.body)
                            .into(table.students)
                            .returning(['id', 'firstname', 'lastname', 'email', 'created_at'])
    } catch (err) {
        return res.status(500).json(answer(500, err, null))
    }
    return res.status(200).json(answer(200, null, rows[0]))
})

app.delete('/students/:user_id', async function(req, res) {
    let rows
    try {
        rows = await knex.delete()
                        .from(table.students)
                        .where({
                            id: req.params.user_id,
                        })
                        .returning(['id', 'firstname', 'lastname', 'email', 'created_at'])
    } catch (err) {
        return res.status(500).json(answer(500, err, null))
    }
    return res.status(200).json(answer(200, null, rows))
})

app.get('/userbyemail/:user_email', async function(req, res) {
    let rows
    try {
        rows = await knex.select(['id','firstname','lastname','email','created_at'])
                        .from(table.students)
                        .where({
                            email: req.params.user_email,
                        })
    } catch(err) {
        return res.status(500).json(answer(500, err, null))
    }
    return res.status(200).json(answer(200, null, rows))
})

app.post('/degree', async function(req, res) {
    let rows
    try {
        rows = await knex.insert(req.body)
                        .into(table.degrees)
                        .returning(['id', 'user_id', 'score', 'date', 'type'])
    } catch (err) {
        return res.status(500).json(answer(500, err, null))
    }
    return res.status(200).json(answer(200, null, rows))
})

app.listen(3000)