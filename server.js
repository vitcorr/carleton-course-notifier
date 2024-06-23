const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const express = require('express')
const pool = require('./database.js')
const app = express()

//middleware
app.use(express.static("public"))
app.use(express.json({limit: '1mb'}))

app.listen(3000, ()=>{
    console.log('Server listening on port 3000 \nhttp://localhost:3000/');

});

//connect database
// client.connect()
// .then(() => console.log('Connected to PostgreSQL database'))
// .catch(error => console.error('Error connecting to the database:', error));


//routes
app.get('/', (req, res)=>{
    res.render('index')
})

//test database outputs
/*this doesnt work for now, use async method*/
app.get('/database', (req, res)=>{
    console.log('hello')
    client.query(`SELECT * FROM courses`, (err, result)=>{
        console.log('pook')
        if(err){
            res.send("there was an error")
            console.log(result.rows)
            return;
        }
        res.send(result.rows)
        console.log(result.rows)

    });
    //client.end();
})

// app.get('/database', async(req, res)=>{
//     console.log('hello')
//     const result1 = await client.query('SELECT * FROM users');
//     res.send(result1.rows)
//     //client.end();
// })

app.post('/', async(req, res)=>{
    console.log('NEW INCOMING REGISTRATION ATTEMPT')
    console.log(req.body);
    const user = req.body;
    //let insertQuery = `INSERT INTO Users (name, email) VALUES('${user.name}', '${user.email}')`
    //start(req.body.term, req.body.crn)

    //CHECK IF REQUEST IS VALID
    const check = await start(user.term, user.crn);
    if (check[0] === "Open" || check[0] === "Closed") {
        try {
            const registrationAdded = await courseRegistration(user.name, user.email, user.crn, check[1], user.term)
            if (registrationAdded) {
              res.send('User registered for the course');
            } else {
              res.send('You already have an active reminder for this course');
            }
          } catch (e) {
            res.status(500).send('Error registering user for the course');
            console.error('Error registering user for the course', e.stack);
          }
        
    }
    else{    
        res.send('Invalid CRN or TERM. Make sure the CRN is correct and matches the Semester');
        console.log("invalid crn/term combo")
    }
})

//MAILING LIST
let mailing_list = []

//transactions
async function courseRegistration(userName, userEmail, crn, courseName, term){
    const client = await pool.connect();
    let registrationAdded = false;

    try{
        await client.query('BEGIN');

        //Check if user already exists
        const findUserText = 'SELECT user_id FROM Users WHERE email = $1';
        const findUserValues = [userEmail];
        const resUser = await client.query(findUserText, findUserValues);

        let userId;
        if (resUser.rows.length > 0) {
            userId = resUser.rows[0].user_id;
            console.log("this user already exists...atempting course insertion")
        } else{
            //Insert user into Users table
            const userText = 'INSERT INTO Users(name, email) VALUES ($1, $2) RETURNING user_id';
            const userValues = [userName, userEmail];
            const resNewUser = await client.query(userText, userValues);
            userId = resNewUser.rows[0].user_id;
            console.log('new user inserted')
            console.log(userId)
        }
        
        // Check if the course already exists
        const findCourseText = 'SELECT crn FROM Courses WHERE crn = $1';
        const findCourseValues = [crn];
        const resCourse = await client.query(findCourseText, findCourseValues);

        if (resCourse.rows.length === 0) {
            // Insert course into Courses table
            const insertCourseText = 'INSERT INTO Courses (crn, name, term, status) VALUES ($1, $2, $3, $4)';
            const insertCourseValues = [crn, courseName, term, 'CLOSED']; // Default to 'CLOSED'
            await client.query(insertCourseText, insertCourseValues);
            console.log('new course inserted to database')

        }else{
            console.log('this course already exists in database so no insertion')
        }

        // Check if the registration already exists
        const findRegistrationText = 'SELECT registration_id FROM Registrations WHERE user_id = $1 AND crn = $2';
        const findRegistrationValues = [userId, crn];
        const resRegistration = await client.query(findRegistrationText, findRegistrationValues);

        if (resRegistration.rows.length === 0) {
        // Insert registration into Registrations table
        const insertRegistrationText = 'INSERT INTO Registrations (user_id, crn) VALUES ($1, $2)';
        const insertRegistrationValues = [userId, crn];
        await client.query(insertRegistrationText, insertRegistrationValues);
        registrationAdded = true;
        }
        else{
            console.log('this user already registered in this course')
        }

        await client.query('COMMIT');

    }   catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }   finally {
        client.release();
    }
    return registrationAdded;

}

async function start(term, crn){
    const browser = await puppeteer.launch({headless: true})
    const page = await browser.newPage()
    await page.goto('https://central.carleton.ca/prod/bwysched.p_select_term?wsea_code=EXT')

    //inputs
    //summer: 202420, fall: 202430, winter: 202510 
    // const term = '202510';
    // const crn = '11247';

    const names = await page.evaluate(() =>{
        return Array.from(document.querySelectorAll("#term_code > option")).map(x => x.textContent)
    })
    await fs.writeFile("name.txt", names.join("\r\n"))

    //Select the term
    await page.select('select[name="term_code"]', term);
    //await page.screenshot({path: "screenshots/amazing.png"})

    // Click the submit button
    await Promise.all([
        page.click('input[type="submit"][value="Proceed to Search"]'),
        page.waitForNavigation()
    ]);
    


    //NEXT PAGE 
    //CRn DINOSAURS = 21525
    await page.type("#crn_id", crn)
    page.click('input[type="submit"][value="Search"]')

    // Click the SEARCH button
    await Promise.all([
        page.click('input[type="submit"][value="Search"]'),
        page.waitForNavigation()
    ]);

    //console.log('New Page URL:', page.url());
    //PRINT STATUS
    const info = await page.$eval('div > table > tbody > tr', el => el.innerText)
    //registration status = [course status, course name ]
    const registrationStatus = [info.split("\t")[1], info.split("\t")[5]]
    // console.log(info)
    // console.log(registrationStatus)

    //close puppeteer browser
    browser.close()
    return registrationStatus;
}

// Example usage:
// const term = '202510';
    // const crn = '11247';
    // (async ()=>{
    //     console.log(await start("202430", "11247"));
    // }) ();
 
//this function will ocasionally get and update the courses status
 async function getDatabaseInfo(){
    const client = await pool.connect();
    try{
        await client.query('BEGIN');

        //
        const status_list = await client.query('SELECT crn, status, term FROM courses');
        console.log(status_list.rows)
        
        //const resultStatusPromises = (status_list.rows).map(async obj => await start(obj.term, `${obj.crn}`))
        const resultStatusPromises = []

        

        for (let i = 0; i < status_list.rows.length; i++) {
            const currentQuery = status_list.rows[i];
            const newQuery = await start(currentQuery.term, `${currentQuery.crn}`)
            resultStatusPromises.push(newQuery)

            //update the database when necessary
            if(!(currentQuery.status == newQuery[0].toUpperCase())){
                if(currentQuery.status == 'OPEN' && newQuery[0] == 'Closed'){
                    await updateCourses('CLOSED', `${currentQuery.crn}`, client)
                }
                else if(currentQuery.status == 'CLOSED' && newQuery[0] == 'Open'){
                    await updateCourses('OPEN', `${currentQuery.crn}`, client)
                    //add to the mailing list if the course just opened
                    mailing_list.push(currentQuery.crn)
                    console.log('added to mailing')
                }
            }
        }

        //const resultStatus = await Promise.all(resultStatusPromises);
        console.log(resultStatusPromises);
        console.log(mailing_list);

        await client.query('COMMIT');

    }   catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }   finally {
        client.release();
    }
 }
 getDatabaseInfo()

 //this function updates a course's status
 async function updateCourses(status, crn, client){
    //const client = await pool.connect();
    const updateText = 'UPDATE courses SET status = $1 WHERE crn = $2';
    const updateValues = [status, crn];
    const result = await client.query(updateText, updateValues);
    //client.release()
    return result
 }