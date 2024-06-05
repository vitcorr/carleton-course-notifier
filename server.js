const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const express = require('express')
const app = express()

//middleware
app.use(express.static("public"))
app.use(express.json({limit: '1mb'}))


//routes
app.get('/', (req, res)=>{
    res.render('index')
})

app.post('/', (req, res)=>{
    console.log(req.body);
    start(req.body.term, req.body.crn)
    res.sendStatus(200);

})

app.listen(3000, ()=>{
    console.log('Server listening on port 3000 \nhttp://localhost:3000/');

});


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

