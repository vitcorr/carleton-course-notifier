
document.getElementById("Loading").style.visibility = "hidden";

function submitButton(){
    document.getElementById("Loading").style.visibility = "visible";
    const term = document.getElementById('term').value
    const crn = document.getElementById('CRN').value
    const email = document.getElementById('email').value
    const name = document.getElementById('name').value

    if(email === ""){
        document.getElementById("Loading").style.visibility = "hidden";
        alert('Enter a valid e-mail')
        return;
    }
    else if(name === ""){
        document.getElementById("Loading").style.visibility = "hidden";
        alert('Please enter your name')
        return;
    }
    
    console.log(term)
    const data = {term, crn, email, name};

    fetch('/', {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: JSON.stringify(data),
    })
    .then(res => res.text())
    .then(data => {
        document.getElementById("Loading").style.visibility = "hidden";
        alert(data)
    })
    .catch(err => console.log('Error: ',err));

}