
function submitButton(){
    const term = document.getElementById('term').value
    const crn = document.getElementById('CRN').value
    const email = document.getElementById('email').value
    const name = document.getElementById('name').value

    if(email === ""){
        alert('Enter a valid e-mail')
        return;
    }
    else if(name === ""){
        alert('Please enter your name')
        return;
    }
    
    console.log(term)
    const data = {term, crn, email, name};

    fetch('http://localhost:3000/', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: JSON.stringify(data),
    })
    .then(res => res.text())
    .then(data => alert(data))
    .catch(err => console.log('Error: ',err));
}