

function submitButton(){
    const term = document.getElementById('term').value
    const crn = document.getElementById('CRN').value
    // const btn = document.createElement("span")
    // btn.innerHTML = term + crn
    // document.body.appendChild(btn);
    console.log(term)
    const data = {term, crn};

    fetch('http://localhost:3000/', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: JSON.stringify(data),
    })
    .then(res => res.text())
    .then(data => console.log(data))
    .catch(err => console.log('Error: ',err));
}