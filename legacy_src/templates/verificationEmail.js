const verificationEmail = (name, verificationUrl) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #2563EB;">Welcome to JobBoard!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" style="display: inline-block; background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                Verify Email Address
            </a>
            <p>Or copy this link: <a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>This link expires in 24 hours.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
        </div>
    `;
};

module.exports = verificationEmail;
