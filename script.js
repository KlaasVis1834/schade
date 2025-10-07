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
    if (!recaptchaResponse || recaptchaResponse.length === 0) {
        messageDiv.textContent = '❗ Bevestig eerst dat u geen robot bent.';
        messageDiv.style.color = '#dc3545';
        submitButton.disabled = false;
        return; // 👉 voorkomt verdere uitvoering
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

    // Berichttekst opbouwen
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

    // E-mailadres valideren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.to_email)) {
        messageDiv.textContent = 'Fout: Ongeldig e-mailadres.';
        messageDiv.style.color = '#dc3545';
        submitButton.disabled = false;
        return;
    }

    // Controleer EmailJS
    if (!window.emailjs) {
        messageDiv.textContent = 'Fout: EmailJS niet geladen.';
        messageDiv.style.color = '#dc3545';
        submitButton.disabled = false;
        return;
    }

    // Bestanden verwerken
    const maxFileSize = 1 * 1024 * 1024; // 1 MB
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
                formData.message += `- ${file.name} (te groot, >1MB)\n`;
                continue;
            }
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
        }
    } else {
        formData.message += '\nBijlagen: Geen';
    }

    // ✅ Alleen als reCAPTCHA geldig is, wordt nu verstuurd
    try {
        await emailjs.send('service_h6az3sj', 'template_naxxu2a', formData);
        await emailjs.send('service_h6az3sj', 'template_yqe7y7e', formData);

        messageDiv.textContent = '✅ Schade succesvol gemeld! Wij nemen spoedig contact met u op.';
        messageDiv.style.color = '#28a745';
        form.reset();
        grecaptcha.reset(); // reset reCAPTCHA
    } catch (error) {
        console.error('EmailJS fout:', error);
        messageDiv.textContent = '❌ Fout bij verzenden. Probeer het later opnieuw.';
        messageDiv.style.color = '#dc3545';
    } finally {
        submitButton.disabled = false;
        if (oversizeFiles) {
            messageDiv.textContent += ' Let op: sommige bestanden waren te groot (>1MB).';
        }
    }
});
