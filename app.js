// Config
require('dotenv').config()
const fs = require('fs')
const express = require('express')
const settings = {
    validityDuration: 60 * 60 * 24 * 365 * 2 * 1000,
    plans: {
        trainer: 'trainerPack',
        recruitment: 'recruitmentPack'
    }
}
const table = {
    students: 'students',
    degrees: 'degrees',
    clients: 'clients'
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

async function checkApiKey(req, res, plan) {
    if (req.headers.atsglobalkey == undefined) {
        return res.status(403).json(answer(403, 'Empty API Key', null))
    }
    try {
        const queryResponse = await knex.count('id')
                        .into(table.clients)
                        .where({
                            key: req.headers.atsglobalkey,
                            plan: plan
                        })
        if (queryResponse[0].count == 0) {
            return res.status(403).json(answer(403, 'Invalid API Key', null))
        }
        return false
    } catch (error) {
        return res.status(500).json(answer(500, error, null))
    }
}

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
        return false
    }
}

/**
 * Retrieve the id of a person by email
*/

app.get('/studentid/byemail/:email', async function(req, res) {
    const keyCheck = await checkApiKey(req, res, settings.plans.recruitment)
    if (keyCheck) { return keyCheck }
    if(!validateEmail(req.params.email)){ 
        return res.status(202).json(answer(202, `The email isn't valid`, null)) 
    }
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
app.get('/studentid/byfullname/:firstname/:lastname', async function(req,res) {
    const keyCheck = await checkApiKey(req, res, settings.plans.recruitment)
    if (keyCheck) { return keyCheck }
    let rows
    try {
        rows = await knex.select(['id'])
                        .from(table.students)
                        // transform the firstname and lastname to lowercase
                        .whereRaw(`LOWER(firstname) = LOWER('${req.params.firstname}') AND LOWER(lastname) = LOWER('${req.params.lastname}')`)
    } catch(err) {
        return res.status(500).json(answer(500, err, null))
    }
    return res.status(200).json(answer(200, null, rows ?? {}))
})

/**
 * Add a student to the database
*/
app.post('/student', async function(req, res) {
    const keyCheck = await checkApiKey(req, res, settings.plans.trainer)
    if (keyCheck) { return keyCheck }
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
 * Check if the degree of a specific user is still valid
*/
app.get('/userDegreeValidity/:user_id', async function(req, res) {
    const keyCheck = await checkApiKey(req, res, settings.plans.trainer)
    if (keyCheck) { return keyCheck }
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
    const keyCheck = await checkApiKey(req, res, settings.plans.trainer)
    if (keyCheck) { return keyCheck }
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
    const keyCheck = await checkApiKey(req, res, settings.plans.recruitment)
    if (keyCheck) { return keyCheck }
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
    // Add the expiration date for each row
    rows.forEach(_row => {
        _row.expirationDate = getExpirationDate(_row.date)
    })
    return res.status(200).json(answer(200, null, rows ?? {}))
})

/**
 * Retrieve id degrees of a person by his user_id
*/
app.get('/degreesid/byuserid/:user_id', async function(req,res) {
    const keyCheck = await checkApiKey(req, res, settings.plans.trainer)
    if (keyCheck) { return keyCheck }
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
    const keyCheck = await checkApiKey(req, res, settings.plans.recruitment)
    if (keyCheck) { return keyCheck }
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
    // Add in rows [0] an expirationDate property with the expiration date
    rows[0].expirationDate = getExpirationDate(rows[0].date)

    return res.status(200).json(answer(200, null, rows[0] ?? {}))
})

/**
 * Get degree as a pdf
*/
app.get('/degree/asPDF/:degree_id', async function(req, res) {
    const keyCheck = await checkApiKey(req, res, settings.plans.trainer)
    if (keyCheck) { return keyCheck }
    const path = `./cdn/degrees/${req.params.degree_id}.pdf`
    try {
        if (fs.existsSync(path)) {
            return res.sendFile(path, { root : __dirname})
        } else {
            return res.status(202).json(answer(202, 'This certificate is not available in PDF yet.', null))
        }
    } catch(err) { return res.status(202).json(answer(202, err, null)) }
})

/**
 * Retrieve statistics about a batch of people
*/
app.get('/statistics/:institut/between/:start/:end', async function(req, res) {
    const keyCheck = await checkApiKey(req, res, settings.plans.trainer)
    if (keyCheck) { return keyCheck }
    // Récupérer toutes les diplomes de cette période
    let degrees
    try {
        degrees = await knex.select(['id', 'score', 'date', 'type', 'oral_score', 'writing_score', 'institut'])
                        .from(table.degrees)
                        .where({ institut: req.params.institut })
                        .whereBetween('date', [req.params.start, req.params.end])
                        .orderBy('score')
    } catch(err) {
        return res.status(500).json(answer(500, err, null))
    }
    let data = {
        writingScore: { average: 0, best: 0, worst: 100000 },
        oralScore: { average: 0, best: 0, worst: 100000 },
        totalScore: { average: 0, best: 0, worst: 100000 }
    }
    degrees.forEach((degree) => {
        // Writing
        data.writingScore.average += degree.writing_score
        if (data.writingScore.best < degree.writing_score) { data.writingScore.best = degree.writing_score }
        if (data.writingScore.worst >= degree.writing_score) { data.writingScore.worst = degree.writing_score }
        // Oral
        data.oralScore.average += degree.oral_score
        if (data.oralScore.best < degree.oral_score) { data.oralScore.best = degree.oral_score }
        if (data.oralScore.worst >= degree.oral_score) { data.oralScore.worst = degree.oral_score }
        // Total
        if (data.totalScore.best < degree.score) { data.totalScore.best = degree.score }
        if (data.totalScore.worst >= degree.score) { data.totalScore.worst = degree.score }
    })
    data.writingScore.average = data.writingScore.average / degrees.length
    data.oralScore.average = data.oralScore.average / degrees.length
    data.totalScore.average = data.writingScore.average + data.oralScore.average
    return res.status(200).json(answer(200, null, data))
})

app.get('*', function(req, res){
    res.status(404).send('This endpoint does not exist. Please visit our documentation.')
})

app.listen(process.env.PORT ||3000)