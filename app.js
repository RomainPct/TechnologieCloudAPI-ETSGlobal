// Config
require('dotenv').config()
const fs = require('fs')
const express = require('express')
const settings = {
    validityDuration: 60 * 60 * 24 * 365 * 2 * 1000
}
const table = {
    students: 'students',
    degrees: 'degrees'
}

const app = express()
app.use(express.json())

const knex = require('knex')({
    client: 'pg',
    connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    }
})

// Utilitarian functions
const answer = (code, err, data) => ({
    statusCode : code,
    error: err,
    data: data
})

function getExpirationDate(dateStr) {
    let dt = new Date(dateStr)
    return new Date(dt.getTime() + settings.validityDuration);
}

function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

    return re.test(String(email).toLowerCase())
}

async function checkIfUserExists(userId) {
    try {
        const queryResponse = await knex.count('id')
                        .into(table.students)
                        .where({ id: userId })
        return parseInt(queryResponse[0].count) != 0
    } catch (err) {
        console.log(err)
        return false
    }
}

/**
 * Get all students
*/

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

/**
 * Delete a student by id
*/

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
*/

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
    return res.status(200).json(answer(200, null, rows[0] ?? {}))
})

/**
 * Retrieve the id of a person by his name & first name
*/
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
    return res.status(200).json(answer(200, null, rows[0] ?? {}))
})

/**
 * Add a student to the database
*/
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
    if(!validateEmail(data.email)) {
        return res.status(202).json(answer(202, `Email is not valid`, null))
    }
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

/**
 * Check if the degree of a spicific user is still valid
*/
app.get('/userDegreeValidity/:user_id', async function(req, res) {
    // Vérifier que l'utilisateur existe
    if (!(await checkIfUserExists(req.params.user_id))) {
        return res.status(202).json(answer(202, `This user does not exist.`, null))
    }
    // Récupérer son dernier diplome
    try {
        const diploms = await knex.select(['date'])
                                    .from(table.degrees)
                                    .where({
                                        user_id: req.params.user_id
                                    })
        // Retourner la date d'expiration
        if (diploms[0] == undefined) {
            return res.status(202).json(answer(202, null, { expirationDate: null}))
        }
        return res.status(200).json(answer(200, null, { expirationDate: getExpirationDate(diploms[0].date)}))
    } catch (error) { return res.status(500).json(answer(500, error, null)) }
})

/**
 * Add a degree to the database
*/
app.post('/degree', async function(req, res) {
    let data = {
        user_id: req.body['user_id'],
        oral_score: req.body['oral_score'],
        writing_score: req.body['writing_score'],
        score: req.body['oral_score'] + req.body['writing_score'],
        type: req.body['type'],
        institut: req.body['institut']
    }
    // Check if user exist
    if (!(await checkIfUserExists(data.user_id))) {
        return res.status(202).json(answer(202, `This user does not exist.`, null))
    }
    // Check if oral score is right
    if (isNaN(data.oral_score) || data.oral_score > 495 || data.oral_score < 0) {
        return res.status(202).json(answer(202, `Oral score must me an integer between 0 and 495.`, null))
    }
    // Check if writing score is right
    if (isNaN(data.writing_score) || data.writing_score > 495 || data.writing_score < 0 ) {
        return res.status(202).json(answer(202, `writing score must me an integer between 0 and 495.`, null))
    }
    // Check if degree type is valid
    if (data.type != 'TOEFL' && data.type != 'TOEIC') {
        return res.status(202).json(answer(202, `This type of diplom does not exists "${data.type}"`, null))
    }
    let rows
    try {
        rows = await knex.insert(data)
                        .into(table.degrees)
                        .returning(['id', 'user_id', 'oral_score', 'writing_score', 'score', 'date', 'type', 'institut'])
    } catch (err) {
        return res.status(500).json(answer(500, err, null))
    }
    return res.status(200).json(answer(200, null, rows[0]))
})

/**
 * Retrieve degrees info by user_id
*/
app.get('/degrees/byuserid/:user_id', async function(req,res) {
    let rows
    try {
        rows = await knex.select(['id', 'score', 'date', 'type', 'oral_score', 'writing_score', 'institut'])
                        .from(table.degrees)
                        .where({
                            user_id: req.params.user_id
                        })
                        .orderBy('date', 'desc')
    } catch(err) {
        return res.status(500).json(answer(500, err, null))
    }

    return res.status(200).json(answer(200, null, rows ?? {}))
})

/**
 * Retrieve id degrees of a person by his user_id
*/
app.get('/iddegree/byuserid/:user_id', async function(req,res) {
    let rows
    try {
        rows = await knex.select(['id'])
                        .from(table.degrees)
                        .where({
                            user_id: req.params.user_id
                        })
    } catch(err) {
        return res.status(500).json(answer(500, err, null))
    }

    return res.status(200).json(answer(200, null, rows ?? {}))
})

/**
 * Retrieve the most recent degree of a person by his user_id
*/
app.get('/lastdegree/byuserid/:user_id', async function(req,res) {
    let rows
    try {
        rows = await knex.select(['id', 'score', 'date', 'type', 'oral_score', 'writing_score', 'institut'])
                        .from(table.degrees)
                        .where({
                            user_id: req.params.user_id
                        })
                        .orderBy('date', 'desc')
                        .limit(1)
    } catch(err) {
        return res.status(500).json(answer(500, err, null))
    }

    return res.status(200).json(answer(200, null, rows[0] ?? {}))
})

/**
 * Get degree as a pdf
*/
app.get('/degree/asPDF/:degree_id', async function(req, res) {
    const path = `./cdn/degrees/${req.params.degree_id}.pdf`
    try {
        if (fs.existsSync(path)) {
            return res.sendFile(path, { root : __dirname})
        } else {
            return res.status(404).json(answer(404, 'File does not exist', null))
        }
    } catch(err) { return res.status(202).json(answer(202, err, null)) }
})

app.listen(3000)