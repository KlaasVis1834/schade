// Menubalk toggle voor mobiel
document.querySelector('.hamburger').addEventListener('click', function() {
    document.querySelector('.nav-list').classList.toggle('active');
});

// Schadeformulier EmailJS + reCAPTCHA-controle
document.getElementById('schade-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = this;
    const messageDiv = document.getElementById('form-message');
    const fileInput = document.getElementById('bijlagen');
    const submitButton = form.querySelector('button[type="submit"]');

    // ✅ Controleer of reCAPTCHA is voltooid
    const recaptchaResponse = grecaptcha.getResponse();
    if (!recaptchaResponse) {
        messageDiv.textContent = 'Bevestig dat je geen robot bent.';
        messageDiv.style.color = '#dc3545';
        return;
    }

    // Disable knop tijdens verzenden
    submitButton.disabled = true;
    messageDiv.textContent = 'Bezig met verzenden...';
    messageDiv.style.color = '#007bff';

    // Formulierdata verzamelen
    const formData = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim() || 'Niet opgegeven',
        insurance: form.insurance.value,
        polisnummer: form.polisnummer.value.trim(),
        datum: form.datum.value,
        beschrijving: form.beschrijving.value.trim(),
        to_email: form.email.value.trim(), // Voor klant
        to_email_mij: 'rbuijs@klaasvis.nl', // Voor jou
        bijlagen_data: []
    };

    // Maak een message-veld voor template_yqe7y7e
    formData.message = `
Nieuwe schademelding ontvangen:

- Naam: ${formData.name}
- E-mail: ${formData.email}
- Telefoon: ${formData.phone}
- Verzekering: ${formData.insurance}
- Polisnummer: ${formData.polisnummer}
- Schadedatum: ${formData.datum}
- Beschrijving: ${formData.beschrijving}
`;

    // Valideer e-mailadressen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.to_email)) {
        messageDiv.textContent = 'Fout: Ongeldig e-mailadres voor klant.';
        messageDiv.style.color = '#dc3545';
        submitButton.disabled = false;
        return;
    }
    if (formData.to_email_mij !== 'mbuijs@klaasvis.nl') {
        console.warn('Waarschuwing: Ontvangstadres voor mij lijkt incorrect:', formData.to_email_mij);
    }

    console.log('Formulierdata:', formData);

    // Controleer of EmailJS beschikbaar is
    if (!window.emailjs) {
        messageDiv.textContent = 'Fout: EmailJS niet geladen. Controleer je internetverbinding.';
        messageDiv.style.color = '#dc3545';
        submitButton.disabled = false;
        return;
    }

    // Bestanden verwerken
    const maxFileSize = 1 * 1024 * 1024; // 1MB
    const maxFiles = 5;
    let oversizeFiles = false;

    if (fileInput.files.length > 0) {
        if (fileInput.files.length > maxFiles) {
            messageDiv.textContent = `Fout: Maximaal ${maxFiles} bestanden toegestaan.`;
            messageDiv.style.color = '#dc3545';
            submitButton.disabled = false;
            return;
        }

        formData.message += '\nBijlagen:\n';
        for (const file of fileInput.files) {
            if (file.size > maxFileSize) {
                oversizeFiles = true;
                formData.message += `- ${file.name} (te groot, >1MB, stuur apart naar mbuijs@klaasvis.nl)\n`;
                continue;
            }

            try {
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                formData.bijlagen_data.push({
                    name: file.name,
                    type: file.type,
                    base64: base64
                });
                formData.message += `- ${file.name}\n`;
            } catch (error) {
                console.error('Fout bij verwerken bestand:', file.name, error);
                messageDiv.textContent = `Fout bij verwerken van ${file.name}. Probeer opnieuw.`;
                messageDiv.style.color = '#dc3545';
                submitButton.disabled = false;
                return;
            }
        }
    } else {
        formData.message += '\nBijlagen: Geen';
    }

    // Verzend naar klant (template_naxxu2a)
    emailjs.send('service_h6az3sj', 'template_naxxu2a', formData)
        .then((response) => {
            console.log('E-mail naar klant verzonden:', response);
            // Verzend naar jou (template_yqe7y7e)
            console.log('Verzenden naar rbuijs@klaasvis.nl met data:', formData);
            return emailjs.send('service_h6az3sj', 'template_yqe7y7e', formData);
        })
        .then((response) => {
            console.log('E-mail naar rbuijs@klaasvis.nl verzonden:', response);
            messageDiv.textContent = 'Schade succesvol gemeld! Wij nemen spoedig contact met u op.';
            messageDiv.style.color = '#28a745';
            form.reset();
            grecaptcha.reset(); // ✅ Reset reCAPTCHA na succesvol verzenden
        })
        .catch((error) => {
            console.error('EmailJS fout:', error);
            let errorMessage = 'Fout bij verzenden. Probeer het later opnieuw.';
            if (error.text) {
                errorMessage += ` Details: ${error.text}`;
            }
            messageDiv.textContent = errorMessage;
            messageDiv.style.color = '#dc3545';
        })
        .finally(() => {
            submitButton.disabled = false;
            // Waarschuwing voor grote bestanden
            if (oversizeFiles) {
                messageDiv.textContent += ` Let op: Sommige bestanden zijn te groot (>1MB). Stuur deze naar mbuijs@klaasvis.nl.`;
            }
        });

});
