  async function submitForm() {
        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const message = document.getElementById("message").value;

        const response = await fetch("/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, message })
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Message Sent',
                text: 'We’ve received your message. Please check your email!',
                confirmButtonColor: '#3085d6'
            });
            document.getElementById("contact-form").reset();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Something went wrong while sending your message.',
                confirmButtonColor: '#d33'
            });
        }
    }
