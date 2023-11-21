const jwt = require('jsonwebtoken');
const authentication = (req, res, next) => {
    //Kiểm tra token chổ này
    const token = (req.headers["authorization"] || '').trim();
    if (!token) {
        res.json({code: "INVALID_TOKEN", message: "Invalid token"});
        return;
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.json({code: "TOKEN_EXPIRED", message: "Token has expired"});
            }
            console.log(`JWT err: ${err}`);
            res.json({code: "INVALID_TOKEN", message: "Invalid token"});
            return;
        }
        req.user = user;
        next();
    });
}

module.exports = {authentication};