const fs = require('fs');
const os = require("os");
const { spawn, exec, execSync } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const md5 = crypto.createHash("md5");

const initString = "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~!@#$%^&*()_+-=`'\"\\/><.,?!:;[]{}| \r\n";

// 加载队列模块
const Queue = require('queue-fun').Queue();
var MaxQ = 10000;
const Q = new Queue(MaxQ, {
    "retry": 0,
    "retryIsJump": false,
    "timeout": 0,
    "event_succ": function (data) {
        // console.log(data);
        console.log(`queue-success: ${data.pid}; data: ${JSON.stringify(data.spawnargs)}`);
    },
    "event_err": function (err) {
        console.error('queue-error:', err);
    }
});

let code = { code: [0, 76, 11, 6], str: "1=b7" };

// for (let c = 0; c < 100; c++) {
setInterval(function () {
    getCode(function (str, c) {
        Q.go(build, [str, c]);
        // console.log(code);
    });
}, 1);

// setInterval(function () {

//     let cpus = os.loadavg();
//     if (cpus[0] < 8) {
//         MaxQ++;
//     } else {
//         MaxQ--;
//     }
//     console.log(`Now threads: ${MaxQ}`);
//     Q.setMax(MaxQ);

// }, 1);


function build(str, c) {

    let file = crypto.createHash('md5').update(str).digest('hex').toUpperCase(); //32位大写 

    if (!fs.existsSync(require('path').join(__dirname, "code"))) {
        fs.mkdir(require('path').join(__dirname, "code"));
    }
    fs.writeFile(path.join(__dirname, `code/${file}.c`), str, function (err) {
        if (!err) {
            if (!fs.existsSync(require('path').join(__dirname, "exe"))) {
                fs.mkdir(require('path').join(__dirname, "exe"));
            }
            exec(`gcc ${path.join(__dirname, `code/${file}.c`)} -o ${path.join(__dirname, `exe/${file}`)}`, function (err, stdout, stderr) {
                if (!err) {
                    if (fs.existsSync(path.join(__dirname, `exe/${file}`))) {
                        console.log(`[${str.length}] ${file} Compile successfully!`);
                    } else {
                        console.log(`[${str.length}] ${file} Compile failure!`);
                        fs.unlinkSync(path.join(__dirname, `code/${file}.c`));
                    }
                } else {
                    console.error(stderr);
                    console.error(`[${str.length}] ${file} Compile error! Error code: ${JSON.stringify({ code: c, str: str })}`);
                    if (fs.existsSync(path.join(__dirname, `code/${file}.c`))) fs.unlinkSync(path.join(__dirname, `code/${file}.c`));
                }
                fs.writeFileSync(path.join(__dirname, `code.json`), JSON.stringify({ code: c, str: str }));
            });
        }
    });
}

function getCode(cb) {
    if (!code) code = {
        code: [0],
        str: '1'
    };

    code.code[code.code.length - 1]++;
    for (let a = code.code.length - 1; a >= 0; a--) {
        if (code.code[a] >= initString.length) {
            if (a !== 0) {
                code.code[a] = 0;
                code.code[a - 1]++;
            } else {
                for (let b = 0; b < code.code.length; b++) {
                    code.code[b] = 0;
                }
                code.code.push(0);
            }
        }
    }

    let c = [];
    for (let w = 0; w < code.code.length; w++) {
        c.push(code.code[w]);
    }

    let str = '';
    for (let w = 0; w < code.code.length; w++) {
        str += initString[code.code[w]];
    }

    code.str = str;

    cb(str, c);
}

// process.on('exit', function () {
//     fs.writeFileSync(path.join(__dirname, `code.json`), JSON.stringify(code));
//     console.log('exit');
// });