
document.getElementById("Loading").style.visibility = "hidden";

function submitButton(){
    const term = document.getElementById('term').value
    const crn = document.getElementById('CRN').value
    const email = document.getElementById('email').value
    const name = document.getElementById('name').value

    if(email === ""){
        document.getElementById("error_email").style.visibility = "visible";
        //alert('Enter a valid e-mail')
        return;
    }else{
        document.getElementById("error_email").style.visibility = "hidden";
    }

    if(name === ""){
        document.getElementById("error_name").style.visibility = "visible";
        //alert('Please enter your name')
        return;
    }else{
        document.getElementById("error_name").style.visibility = "hidden";
    }

    if(crn === ""){
        document.getElementById("error_crn").style.visibility = "visible";
        //alert('Please enter a valid crn')
        return;
    }else{
        document.getElementById("error_crn").style.visibility = "hidden";
    }
    
    document.getElementById("Loading").style.visibility = "visible";
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