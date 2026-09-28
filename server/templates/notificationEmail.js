const buildEmailHtml = ({ title, message, actionUrl }) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #1677ff; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0;">ShikshaSaarthi</h2>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Ministry of Tribal Affairs</p>
      </div>
      <div style="padding: 30px;">
        <h3 style="color: #1f2937; margin-top: 0;">${title}</h3>
        <p style="color: #4b5563; line-height: 1.6;">${message}</p>
        ${actionUrl ? `
          <div style="margin-top: 30px; text-align: center;">
            <a href="${actionUrl}" style="background-color: #1677ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">View in Portal</a>
          </div>
        ` : ''}
      </div>
      <div style="background-color: #f9fafb; padding: 15px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">This is an automated message. Please do not reply.</p>
      </div>
    </div>
  `;
};
module.exports = { buildEmailHtml };
