const fs = require('fs');

let a = "好";
let er = a.charCodeAt();
console.log(er);

fs.writeFileSync('t', new Buffer(er), { mode: 33277 });