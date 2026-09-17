const welcomeEmail = (name, role, dashboardUrl) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #2563EB;">Welcome to JobBoard, ${name}! 🎉</h2>
            <p>Your account has been successfully verified.</p>
            <p>As a ${role}, you can now:</p>
            <ul>
                ${role === 'company' ? `
                    <li>Post job openings</li>
                    <li>Review applications</li>
                    <li>Find talented candidates</li>
                ` : `
                    <li>Browse job listings</li>
                    <li>Apply to positions</li>
                    <li>Track your applications</li>
                `}
            </ul>
            <a href="${dashboardUrl}" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                Go to Dashboard
            </a>
            <hr>
            <p style="color: #666; font-size: 12px;">You're receiving this because you verified your email on JobBoard.</p>
        </div>
    `;
};

module.exports = welcomeEmail;
