const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const express = require('express')
const client = require('./database.js')
const app = express()

//middleware
app.use(express.static("public"))
app.use(express.json({limit: '1mb'}))

app.listen(3000, ()=>{
    console.log('Server listening on port 3000 \nhttp://localhost:3000/');

});

//connect database
client.connect()
.then(() => console.log('Connected to PostgreSQL database'))
.catch(error => console.error('Error connecting to the database:', error));


//routes
app.get('/', (req, res)=>{
    res.render('index')
})

//test database outputs
/*this doesnt work for now, use async method*/
app.get('/database', (req, res)=>{
    console.log('hello')
    client.query(`SELECT * FROM users`, (err, result)=>{
        console.log('pook')
        if(err){
            res.send("there was an error")
            console.log(result.rows)
            return;
        }
        res.send(result.rows)

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
    let insertQuery = `INSERT INTO Users (name, email) VALUES('${user.name}', '${user.email}')`
    //start(req.body.term, req.body.crn)
    res.sendStatus(200);
    client.query(insertQuery, (err, result) => {
        if (!err) {
            console.log("Insertion Succesful");
            return;
        }
        //res.send("there was an error in insertion");
        console.log(err.message);


    });

})




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
    await page.screenshot({path: "screenshots/amazing.png"})

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
    const registrationStatus = info.split("\t")[1]
    console.log(info)

    //close puppeteer browser
    browser.close()
}

