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

app.post('/student', async function(req, res) {
    const data = {
        firstname: req.body['firstname'],
        lastname: req.body['lastname'],
        email: req.body['email']
    }
    if (data.firstname == undefined || data.firstname.length == 0) {
        return res.status(202).json(answer(202, `First name can't be empty`, null))
    }
    if (data.lastname == undefined || data.lastname.length == 0) {
        return res.status(202).json(answer(202, `Last name can't be empty`, null))
    }
    // TO DO : check email
    let rows
    try {
        rows = await knex.insert(data)
                            .into(table.students)
                            .returning(['id', 'firstname', 'lastname', 'email', 'created_at'])
    } catch (err) {
        return res.status(500).json(answer(500, err, null))
    }
    return res.status(200).json(answer(200, null, rows[0]))
})

app.post('/degree', async function(req, res) {
    let data = {
        user_id: req.body['user_id'],
        oral_score: req.body['oral_score'],
        writting_score: req.body['writting_score'],
        score: req.body['oral_score'] + req.body['writting_score'],
        type: req.body['type'],
        institut: req.body['institut']
    }
    // TO DO : Vérifier si l'user_id correspond à un utilisateur
    if (isNaN(data.oral_score)) {
        return res.status(202).json(answer(202, `Oral score must me an integer`, null))
    }
    if (isNaN(data.writting_score)) {
        return res.status(202).json(answer(202, `Writting score must me an integer`, null))
    }
    if (data.type != 'TOEFL' && data.type != 'TOEIC') {
        return res.status(202).json(answer(202, `This type of diplom does not exists "${data.type}"`, null))
    }
    let rows
    try {
        rows = await knex.insert(data)
                        .into(table.degrees)
                        .returning(['id', 'user_id', 'oral_score', 'writting_score', 'score', 'date', 'type', 'institut'])
    } catch (err) {
        return res.status(500).json(answer(500, err, null))
    }
    return res.status(200).json(answer(200, null, rows[0]))
})

app.listen(3000)