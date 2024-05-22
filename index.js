const puppeteer = require('puppeteer');
const fs = require('fs/promises');


async function start(){
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.goto('https://central.carleton.ca/prod/bwysched.p_select_term?wsea_code=EXT')

    const names = await page.evaluate(() =>{
        return Array.from(document.querySelectorAll("#term_code > option")).map(x => x.textContent)
    })
    await fs.writeFile("name.txt", names.join("\r\n"))

    //Select the term
    await page.select('select[name="term_code"]', '202420');
    await page.screenshot({path: "amazing.png"})

    // Click the submit button
    await Promise.all([
        page.click('input[type="submit"][value="Proceed to Search"]'),
        page.waitForNavigation()
    ]);
    

    await page.screenshot({path: "amazing.png"})

    //NEXT PAGE 
    //CRn DINOSAURS = 21525
    await page.type("#crn_id", '21525')
    page.click('input[type="submit"][value="Search"]')

    // Click the SEARCH button
    await Promise.all([
        page.click('input[type="submit"][value="Search"]'),
        page.waitForNavigation()
    ]);

    console.log('New Page URL:', page.url());
    //PRINT STATUS
    const info = await page.$eval('font[color="red"]', el => el.textContent)
    console.log(info)

}

function main(){
    console.log('ENTER A SEMESTER /n 1 for Fall /n 2 for Winter 3 for Summer');
    console.log('1')
    switch(semester) {
        case x:
          // code block
          break;
        case y:
          // code block
          break;
        default:
          // code block
      }
}
start()