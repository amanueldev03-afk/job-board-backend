const validator = require('email-validator');
const deepEmailValidator = require('deep-email-validator');

const validateEmailFormat = (email) => {
    return validator.validate(email);
};

const validateEmailDeliverable = async (email) => {
    try {
        const result = await deepEmailValidator({
            email: email,
            validateSMTP: true,
            validateMx: true,
            validateDisposable: true,
            validateRegex: true
        });
        
        return {
            valid: result.valid,
            reason: result.valid ? null : result.reason,
            suggestions: result.suggestions || null
        };
    } catch (error) {
        return { valid: true, reason: null, suggestions: null };
    }
};

const isDisposableEmail = (email) => {
    const disposableDomains = [
        'tempmail.com', '10minutemail.com', 'guerrillamail.com',
        'mailinator.com', 'yopmail.com', 'throwaway.com',
        'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
        'tempmail.net', 'sharklasers.com', 'guerrillamail.net'
    ];
    const domain = email.split('@')[1];
    return disposableDomains.includes(domain);
};

const getEmailProvider = (email) => {
    const domain = email.split('@')[1].toLowerCase();
    const providers = {
        'gmail.com': 'Gmail',
        'yahoo.com': 'Yahoo',
        'outlook.com': 'Outlook',
        'hotmail.com': 'Hotmail',
        'protonmail.com': 'ProtonMail',
        'icloud.com': 'iCloud',
        'aol.com': 'AOL',
        'zoho.com': 'Zoho'
    };
    return providers[domain] || 'Other';
};

const validateEmail = async (email) => {
    // Step 1: Check format
    if (!validateEmailFormat(email)) {
        return {
            valid: false,
            message: 'Invalid email format. Please enter a valid email address.',
            code: 'INVALID_FORMAT'
        };
    }
    
    // Step 2: Check disposable email
    if (isDisposableEmail(email)) {
        return {
            valid: false,
            message: 'Temporary/disposable email addresses are not allowed. Please use a permanent email address.',
            code: 'DISPOSABLE_EMAIL'
        };
    }
    
    // Step 3: Deep validation (SMTP, MX records)
    const deepResult = await validateEmailDeliverable(email);
    
    if (!deepResult.valid) {
        const messages = {
            smtp: 'Email server does not exist or is not responding.',
            mx: 'No mail server found for this domain.',
            disposable: 'Disposable email addresses are not allowed.',
            regex: 'Invalid email format.'
        };
        
        return {
            valid: false,
            message: messages[deepResult.reason] || 'Email address may not be deliverable.',
            code: deepResult.reason,
            suggestions: deepResult.suggestions
        };
    }
    
    return {
        valid: true,
        message: 'Email is valid',
        provider: getEmailProvider(email),
        code: 'VALID'
    };
};

module.exports = {
    validateEmailFormat,
    validateEmailDeliverable,
    isDisposableEmail,
    getEmailProvider,
    validateEmail
};