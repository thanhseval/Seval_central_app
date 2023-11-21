const express = require('express');
const users = require("../src/modules/users");
const router = express.Router();
const cors = require('cors'); // Import cors
const refreshTokens = [];
router.use(cors());
/* GET users listing. */
router.post("/login", async (req, res, next) => {
    // Authenticate User First
    try {
        await users.login({ req, res, refreshTokens });
    } catch (e) {
        console.error(e);
        res.send({
            code: e.code || 'UNEXPECTED_ERROR', message: e.message || "Unexpected error"
        });
    }
});

router.post("/token", async (req, res) => {
    try {
        await users.refreshToken({ req, res, refreshTokens });
    } catch (e) {
        console.error(e);
        res.send({
            code: e.code || 'UNEXPECTED_ERROR', message: e.message || "Unexpected error"
        });
    }
});

module.exports = router;
