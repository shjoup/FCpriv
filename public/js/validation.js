const form = document.getElementById('form')
const username_input = document.getElementById('username-input')
const email_input = document.getElementById('email-input')
const password_input = document.getElementById('password-input')
const repeat_password_input = document.getElementById('repeat-password-input')
const error_message = document.getElementById('error-message')

form.addEventListener('submit', async (e) => {
    e.preventDefault()

    let errors = [] 
    if (username_input){
        errors = getSignupFormErrors(username_input.value, email_input.value, password_input.value, repeat_password_input.value)

    }
    else 
        errors= getLoginFormErrors(email_input.value, password_input.value)

    if(errors.length > 0){
        error_message.innerText=errors.join(". ")
        return
    }

    error_message.innerText = ''
    const isSignup = Boolean(username_input)
    const submitButton = form.querySelector('button[type="submit"]')
    submitButton.disabled = true

    try {
        const response = await fetch(isSignup ? '/api/auth/signup' : '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(isSignup ? {
                username: username_input.value,
                email: email_input.value,
                password: password_input.value,
                repeatPassword: repeat_password_input.value
            } : {
                email: email_input.value,
                password: password_input.value
            })
        })
        const result = await response.json()
        if (!response.ok) {
            error_message.innerText = result.error || 'Authentication failed. Please try again.'
            const field = {
                username: username_input,
                email: email_input,
                password: password_input,
                repeatPassword: repeat_password_input
            }[result.field]
            field?.parentElement.classList.add('incorrect')
            return
        }
        window.location.assign('/')
    } catch {
        error_message.innerText = 'Could not reach the server. Open this page through the running app.'
    } finally {
        submitButton.disabled = false
    }
})

function getLoginFormErrors(email, password){
    let errors = []

    if(email === '' || email == null){
        errors.push('Email is required')
        email_input.parentElement.classList.add('incorrect')
    }
    if(password === '' || password == null){
        errors.push('Password is required')
        password_input.parentElement.classList.add('incorrect')
    }
    return errors;
}





function getSignupFormErrors(username, email, password, repeatpassword){
    let errors  = []

    if(username === '' || username == null){
        errors.push('Username is required')
        username_input.parentElement.classList.add('incorrect')
    }
    if(email === '' || email == null){
        errors.push('Email is required')
        email_input.parentElement.classList.add('incorrect')
    }
    if(password === '' || password == null){
        errors.push('Password is required')
        password_input.parentElement.classList.add('incorrect')
    }
    else if(password.length < 8){
        errors.push('Password must have at least 8 characters')
        password_input.parentElement.classList.add('incorrect')
    }
    if(repeatpassword === '' || repeatpassword == null){
        errors.push('Repeat password is required')
        repeat_password_input.parentElement.classList.add('incorrect')
    }
    else if(repeatpassword !== password){
        errors.push('Passwords must match')
        repeat_password_input.parentElement.classList.add('incorrect')
        password_input.parentElement.classList.add('incorrect')
    }

    return errors;
}

const allInputs = [username_input, email_input, password_input, repeat_password_input].filter(input => input != null)

allInputs.forEach(input => {
    input.addEventListener('input', () => {
        if(input.parentElement.classList.contains('incorrect')){
            input.parentElement.classList.remove('incorrect')
            error_message.innerText =''
        }
    })
})
