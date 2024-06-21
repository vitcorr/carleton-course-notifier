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
    console.log(req.body);
    const user = req.body;
    //let insertQuery = `INSERT INTO Users (name, email) VALUES('${user.name}', '${user.email}')`
    //start(req.body.term, req.body.crn)

    //CHECK IF REQUEST IS VALID
    const check = await start(user.term, user.crn);
    if (check[0] === "Open" || check[0] === "Closed") {
        courseRegistration(user.name, user.email, user.crn, check[1], user.term)
        .then(() => console.log('User registered for the course'))
        .catch(e => console.error('Error registering user for the course', e.stack));
    res.sendStatus(200);
    }
    else{    
        console.log("invalid crn/term combo")
    }
})


//transactions
async function courseRegistration(userName, userEmail, crn, courseName, term){
    const client = await pool.connect();
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

        // Insert registration into Registrations table
        const insertRegistrationText = 'INSERT INTO Registrations (user_id, crn) VALUES ($1, $2)';
        const insertRegistrationValues = [userId, crn];
        await client.query(insertRegistrationText, insertRegistrationValues);

        await client.query('COMMIT');

    }   catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }   finally {
        client.release();
    }
}

async function start(term, crn){
    const browser = await puppeteer.launch({headless: false})
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

    console.log('New Page URL:', page.url());
    //PRINT STATUS
    const info = await page.$eval('div > table > tbody > tr', el => el.innerText)
    const registrationStatus = [info.split("\t")[1], info.split("\t")[5]]
    // console.log(info)
    // console.log(registrationStatus)

    //close puppeteer browser
    //browser.close()
    return registrationStatus;
}

// Example usage:
// const term = '202510';
    // const crn = '11247';
    // (async ()=>{
    //     console.log(await start("202430", "11247"));
    // }) ();
