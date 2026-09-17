const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');
const verificationEmailTemplate = require('../templates/verificationEmail');
const welcomeEmailTemplate = require('../templates/welcomeEmail');
const passwordResetEmailTemplate = require('../templates/passwordResetEmail');

const transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: parseInt(env.EMAIL_PORT),
    secure: env.EMAIL_SECURE === 'true',
    auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS
    },
    family: 4
});

const sendEmail = async (options) => {
    try {
        const mailOptions = {
            from: env.EMAIL_FROM,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html
        };

        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email sent to ${options.to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error(`Email failed to ${options.to}: ${error.message}`);
        throw new Error(`Email sending failed: ${error.message}`);
    }
};

const sendVerificationEmail = async (email, name, token) => {
    const verificationUrl = `${env.CLIENT_URL}/verify-email/${token}`;
    
    const html = verificationEmailTemplate(name, verificationUrl);
    const text = `Welcome to JobBoard!\n\nPlease verify your email by visiting: ${verificationUrl}\n\nThis link expires in 24 hours.`;

    return await sendEmail({
        to: email,
        subject: 'Verify Your Email Address - JobBoard',
        text,
        html
    });
};

const sendWelcomeEmail = async (email, name, role) => {
    const dashboardUrl = role === 'company' ? '/company/dashboard' : '/candidate/dashboard';
    const fullDashboardUrl = `${env.CLIENT_URL}${dashboardUrl}`;

    const html = welcomeEmailTemplate(name, role, fullDashboardUrl);
    const text = `Welcome to JobBoard, ${name}!\n\nYour account has been verified.\n\nLogin here: ${env.CLIENT_URL}/login`;

    return await sendEmail({
        to: email,
        subject: 'Welcome to JobBoard!',
        text,
        html
    });
};

const sendPasswordResetEmail = async (email, name, token) => {
    const resetUrl = `${env.CLIENT_URL}/reset-password/${token}`;

    const html = passwordResetEmailTemplate(name, resetUrl);
    const text = `Reset your password by visiting: ${resetUrl}\n\nThis link expires in 1 hour.`;

    return await sendEmail({
        to: email,
        subject: 'Reset Your Password - JobBoard',
        text,
        html
    });
};

const sendApplicationConfirmation = async (email, name, jobTitle, companyName) => {
    const applicationsUrl = `${env.CLIENT_URL}/candidate/applications`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #2563EB;">Application Submitted! ✅</h2>
            <p>Hi ${name},</p>
            <p>Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been successfully submitted.</p>
            <p>The employer will review your application and contact you if you're shortlisted.</p>
            <a href="${applicationsUrl}" style="display: inline-block; background-color: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                Track Your Applications
            </a>
            <p>Good luck! 🍀</p>
            <hr>
            <p style="color: #666; font-size: 12px;">You can check your application status anytime in your dashboard.</p>
        </div>
    `;

    const text = `Your application for ${jobTitle} at ${companyName} has been submitted. Track it at: ${applicationsUrl}`;

    return await sendEmail({
        to: email,
        subject: `Application Submitted: ${jobTitle} at ${companyName}`,
        text,
        html
    });
};

const sendApplicationStatusUpdate = async (email, name, jobTitle, companyName, status, note = '') => {
    const statusColors = {
        reviewed: '#3B82F6',
        shortlisted: '#10B981',
        rejected: '#EF4444',
        hired: '#8B5CF6'
    };

    const statusMessages = {
        reviewed: 'has been reviewed',
        shortlisted: 'You have been shortlisted for an interview! 🎉',
        rejected: 'has been filled by another candidate',
        hired: 'Congratulations! You have been hired! 🎉🎉'
    };

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: ${statusColors[status] || '#2563EB'};">Application Update</h2>
            <p>Hi ${name},</p>
            <p>Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> ${statusMessages[status] || `status updated to ${status}`}.</p>
            ${note ? `<p><strong>Note from employer:</strong> ${note}</p>` : ''}
            ${status === 'shortlisted' ? `
                <p>The employer will contact you shortly with interview details.</p>
            ` : ''}
            <a href="${env.CLIENT_URL}/candidate/applications" style="display: inline-block; background-color: ${statusColors[status] || '#2563EB'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                View Application Status
            </a>
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated notification from JobBoard.</p>
        </div>
    `;

    const text = `Your application for ${jobTitle} at ${companyName} ${statusMessages[status]}. ${note ? `Note: ${note}` : ''}`;

    return await sendEmail({
        to: email,
        subject: `Application Update: ${jobTitle} at ${companyName}`,
        text,
        html
    });
};

const sendNewApplicationNotification = async (companyEmail, companyName, jobTitle, candidateName) => {
    const applicationsUrl = `${env.CLIENT_URL}/company/applications`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #2563EB;">New Application Received! 📝</h2>
            <p>Hi ${companyName},</p>
            <p><strong>${candidateName}</strong> has applied for <strong>${jobTitle}</strong>.</p>
            <a href="${applicationsUrl}" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                Review Applications
            </a>
            <hr>
            <p style="color: #666; font-size: 12px;">Login to your dashboard to review candidate details.</p>
        </div>
    `;

    const text = `New application received for ${jobTitle} from ${candidateName}. Review at: ${applicationsUrl}`;

    return await sendEmail({
        to: companyEmail,
        subject: `New Application: ${jobTitle}`,
        text,
        html
    });
};

const sendAccountDeletionConfirmation = async (email, name, deletionUrl, gracePeriodDays) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #EF4444;">Account Deletion Request</h2>
            <p>Hi ${name},</p>
            <p>We received a request to delete your JobBoard account.</p>
            <p><strong>Important:</strong> After you confirm, your account will be permanently deleted after ${gracePeriodDays} days.</p>
            <p>All your data including jobs, applications, and profile information will be removed.</p>
            <a href="${deletionUrl}" style="display: inline-block; background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                Confirm Account Deletion
            </a>
            <p>This link expires in 24 hours.</p>
            <p>If you did not request this, please ignore this email or <a href="${env.CLIENT_URL}/contact-support">contact support</a>.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">You can cancel this request by logging into your account.</p>
        </div>
    `;

    const text = `Account Deletion Request\n\nHi ${name},\n\nWe received a request to delete your account. Confirm by visiting: ${deletionUrl}\n\nThis link expires in 24 hours. Your account will be deleted after ${gracePeriodDays} days.`;

    return await sendEmail({
        to: email,
        subject: 'Account Deletion Request - JobBoard',
        text,
        html
    });
};

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendApplicationConfirmation,
    sendApplicationStatusUpdate,
    sendNewApplicationNotification,
    sendAccountDeletionConfirmation
};