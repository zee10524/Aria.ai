const nodemailer = require("nodemailer");

const sendEmail = async (email, code) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be configured");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  await transporter.verify();

  const info = await transporter.sendMail({
    from: emailUser,
    to: email,
    subject: "Verification Code",
    text: `Your verification code is: ${code}`,
  });

  console.log("Email sent successfully:", info.response);
};

module.exports = sendEmail;