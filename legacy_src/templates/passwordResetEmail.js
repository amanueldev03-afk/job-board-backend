const passwordResetEmail = (name, resetUrl) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #2563EB;">Reset Your Password</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                Reset Password
            </a>
            <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">For security, do not share this link with anyone.</p>
        </div>
    `;
};

module.exports = passwordResetEmail;
