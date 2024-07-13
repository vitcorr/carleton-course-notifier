const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const express = require('express')
const pool = require('./database.js')
const app = express()
const port = process.env.PORT || 3000;
const nodemailer = require('nodemailer')
require("dotenv").config();

//middleware
app.use(express.static("public"))
app.use(express.json({limit: '1mb'}))

app.listen(port, ()=>{
    console.log(`Server listening on port ${port} \nhttp://localhost:3000/`);

});


//routes
app.get('/', (req, res)=>{
    res.render('index')
})

//test database outputs
/*this doesnt work for now, use async method*/
app.get('/start-script', async (req, res) => {
    try {
        await main();
        res.send('script initiated.'); // Optional response to indicate the test started
    } catch (error) {
        console.error('Error running script:', error);
        res.status(500).send('Error running script:');
    }
});

app.get('/test-db', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        res.send(result.rows);
        client.release();
    } catch (err) {
        console.error(err);
        res.send("Error " + err);
    }
});

app.get('/get-users', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM USERS');
        res.send(result.rows);
        client.release();
    } catch (err) {
        console.error(err);
        res.send("Error " + err);
    }
});




app.post('/', async(req, res)=>{
    console.log('NEW INCOMING REGISTRATION ATTEMPT')
    console.log(req.body);
    const user = req.body;

    //CHECK IF REQUEST IS VALID
    const browser = await puppeteer.launch({
        args: [
            "--disable-setuid-sandbox",
            "--no-sandbox",
            "--single-process",
            "--no-zygote",
        ],
        executablePath: 
            process.env.NODE_ENV === 'production' 
            ? process.env.PUPPETEER_EXECUTABLE_PATH
            : puppeteer.executablePath(),

        headless: true})
    const check = await start(user.term, user.crn, browser);
    browser.close();
    if (!(check[1] === 'undefined (undefined)')) {
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

//LIST OF CRNS THAT JUST OPENED
let open_crn_list = []
//list of emails to be notified
let emails_list = []

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

async function start(term, crn, browser){
    const page = await browser.newPage()
    await page.goto('https://central.carleton.ca/prod/bwysched.p_select_term?wsea_code=EXT')

    //Select the term
    await page.select('select[name="term_code"]', term);

    // Click the submit button
    await Promise.all([
        page.click('input[type="submit"][value="Proceed to Search"]'),
        page.waitForNavigation(),
    ]);

    //NEXT PAGE 
    await page.type("#crn_id", crn)

    // Click the SEARCH button
    await Promise.all([
        page.click('input[type="submit"][value="Search"]'),
        page.waitForNavigation(),
    ]);

    const info = await page.$eval('div > table > tbody > tr', el => el.innerText)
    //registration status = [course status, course name ]
    const registrationStatus = [info.split("\t")[1], info.split("\t")[3] + " (" +info.split("\t")[5]+")"]
    // console.log(info)
    // console.log(registrationStatus)

    //close puppeteer browser
    await page.close()
    return registrationStatus;
}

 
//this function will ocasionally get and update the courses status
 async function getDatabaseInfo(){
    //connect to the database
    const client = await pool.connect();
    try{
        await client.query('BEGIN');

        //get all the courses from the database
        const status_list = await client.query('SELECT crn, status, term FROM courses');
        console.log('printing database info...line 221')
        console.log(status_list.rows)

        //list to store the latest course results
        const latest_course_results = []

        //start the browser to begin search
        const browser = await puppeteer.launch({
            args: [
                "--disable-setuid-sandbox",
                "--no-sandbox",
                "--single-process",
                "--no-zygote",
            ],
            executablePath: 
                process.env.NODE_ENV === 'production' 
                ? process.env.PUPPETEER_EXECUTABLE_PATH
                : puppeteer.executablePath(),

            headless: false})
        //loop through the courses from the database
        for (let i = 0; i < status_list.rows.length; i++) {
            const currentQuery = status_list.rows[i];
            const newQuery = await start(currentQuery.term, `${currentQuery.crn}`, browser)
            latest_course_results.push(newQuery)

            //update the database when necessary -----!UPDATE LOGIC FOR WAITLIST AND OTHERS!-----
            
                if(currentQuery.status == 'OPEN' && newQuery[0] != 'Open' && newQuery[0] != 'Waitlist Open'){
                    await updateCourses('CLOSED', `${currentQuery.crn}`, client)
                    console.log("updated db with new closed status")
                }
                else if(currentQuery.status == 'CLOSED' && (newQuery[0] === 'Open' || newQuery[0] === 'Waitlist Open')){
                    await updateCourses('OPEN', `${currentQuery.crn}`, client)
                    //add to the open crn list if the course just opened
                    open_crn_list.push(currentQuery.crn)
                    console.log('added to open crn list')
                }
            
        }
        browser.close()
        console.log('printing new status info...line 245')
        console.log(latest_course_results);
        console.log('printing crns that just opened...line 247')
        console.log(open_crn_list);

        await client.query('COMMIT');

    }   catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }   finally {
        client.release();
    }
 }

 //this function updates a course's status
 async function updateCourses(status, crn, client){
    //const client = await pool.connect();
    const updateText = 'UPDATE courses SET status = $1 WHERE crn = $2';
    const updateValues = [status, crn];
    const result = await client.query(updateText, updateValues);
    //client.release()
    return result
 }

 //function to get the emails to be notified, NEEDS FURTHER TESTING
 async function getEmailList(array){
    const client = await pool.connect();
    const list_query_text = `
    SELECT u.name AS user_name, u.email, c.name AS course_name, c.crn
    FROM Users u
    JOIN Registrations r ON u.user_id = r.user_id
    JOIN Courses c ON r.crn = c.crn
    WHERE c.crn = ANY($1);
` 
    // const query_values = [`${...array}`]
    const xxx = [32705, 32706, 32719]
    const query_values = [array]

    const result = await client.query(list_query_text, query_values);
    console.log('printing emails to be notified...line 294')
    console.log(result.rows)
    //emails_list.push(result.rows)
    emails_list = result.rows
    console.log('get emails works')

    client.release()
    //return []
 }

 async function sendEmail(user_name, user_email, course_name, crn){
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'victor.kolaw@gmail.com',
          pass: process.env.PASS
        }
    })

    var mailOptions = {
        from: 'victor.kolaw@gmail.com',
        to: user_email,
        subject: 'Open Seat in Course Requested',
        text: `Hello ${user_name},\n \n \tA seat/WaitList just opened up in ${course_name}. Register ASAP before the seat is taken!
        You are getting this email because you created a reminder for the course with CRN: ${crn}`
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
    });
 }


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main(){
    while (true){
        await getDatabaseInfo();
        await getEmailList(open_crn_list);

        for (let i = 0; i < emails_list.length; i++) {
            const element = emails_list[i];
            await sendEmail(element.user_name, element.email, element.course_name, element.crn)
        }
    
        //clear the lists after each run
        open_crn_list = []
        emails_list = []
        // 10 minutes = 10 * 60 * 1000 milliseconds
        await delay(10000);
    }
}

