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

/**
 * Retrieve the id of a person by email
**/

//Check the email
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

    return re.test(String(email).toLowerCase())
}

app.get('/studendid/byemail/:email', async function(req, res) {

    // if the email == false
    if(!validateEmail(req.params.email)){ 
        return res.status(202).json(answer(202, `The email isn't valid`, null)) 
    }

    // else the code is running
    let rows
    try {
        rows = await knex.select(['id'])
                        .from(table.students)
                        .where({
                            email: req.params.email,
                        })
    } catch(err) {
        return res.status(500).json(answer(500, err, null))
    }
    return res.status(200).json(answer(200, null, rows[0]))
})

/**
 * Retrieve the id of a person by his name & first name
**/
app.get('/studendid/byfullname/:firstname/:lastname', async function(req,res) {
    let rows
    try {
        rows = await knex.select(['id'])
                        .from(table.students)
                        // transform the firstname and lastname to lowercase
                        .whereRaw(`LOWER(firstname) = LOWER('${req.params.firstname}') AND LOWER(lastname) = LOWER('${req.params.lastname}')`)
    } catch(err) {
        return res.status(500).json(answer(500, err, null))
    }

    return res.status(200).json(answer(200, null, rows[0]))
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