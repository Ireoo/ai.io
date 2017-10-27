function email(title, code, content, cb) {
    let transporter = nodemailer.createTransport({
        //https://github.com/andris9/nodemailer-wellknown#supported-services 支持列表
        service: config.email.service,
        port: config.email.port, // SMTP 端口
        secureConnection: config.email.secureConnection, // 使用 SSL
        auth: {
            user: config.email.username,
            //这里密码不是qq密码，是你设置的smtp密码
            pass: config.email.password
        }
    });

    let mailOptions = {
        from: config.email.from, // 发件地址
        to: '19980108@qq.com', //'2636466208@qq.com', // 收件列表
        subject: `AI ${title}`,
        html: `<div class="code">${code}</div><div class="console">${content}</div>`
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            return logger.error(error);
        } else {
            logger.info('Message sent: ' + info.response);
            cb({ info: info.response });
        }
    });
}

exports = module.exports = email;