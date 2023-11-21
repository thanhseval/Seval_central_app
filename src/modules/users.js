const jwt = require("jsonwebtoken");
const databaseFunctions = require('../lib/libposgres');

const moment = require('moment-timezone');
const users = {
    /**
     * User login
     * @param {Object} options
     * @param {Request} options.req
     * @param {Response} options.res
     * @param {string[]} options.refreshTokens
     * @return {Promise<void>}
     */
    login: async (options) => {
        const { req, res, refreshTokens } = options;
        const { username, password } = req.body;
        const user = { username: username, password: password };
        const ret = {
            code: '', token: '', message: ''
        };
        // Construct the condition for the query as an array
        const condition = [
            `user_name = '${user.username}'`
        ];

        // Get data from the database using the select function with all fields and the specified condition
        const selectData = {
            tableName: 'user',
            fields: '*',
            condition: condition,
        };

        const resultData = await databaseFunctions.select(selectData);
        const data = resultData.data[0];

        // If the user does not exist, return an error
        if (!data) {
            ret.code = 'USER_DOES_NOT_EXIST';
            ret.message = 'User does not exist';
            res.json(ret);
            return;
        }

        // Compare the user's password to the password stored in the database
        const isPasswordValid = await compare(password, data.password);

        // If the password is not valid, return an error
        if (!isPasswordValid) {
            ret.code = 'USERNAME_OR_PASSWORD_IS_INCORRECT';
            ret.message = 'Username or password is incorrect';
            res.json(ret);
            return;
        }

        // Generate a JWT token
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '1h',
        });

        // Set the token in the response
        ret.token = token;

        // Return the response
        res.json(ret);
    },

    /**
     * User refresh token
     * @param {Object} options
     * @param {Request} options.req
     * @param {Response} options.res
     * @param {string[]} options.refreshTokens
     * @return {Promise<*>}
     */
    refreshToken: async (options) => {
        const { req, res, refreshTokens } = options;
        const refreshToken = req.body.token;
        // console.log(refreshTokens);

        const ret = { code: '', message: '', token: '' };

        if (!refreshToken || !refreshTokens.includes(refreshToken)) {
            ret.code = 'REFRESH_TOKEN_IS_INVALID';
            ret.message = 'Refresh token is invalid';
        } else {
            jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
                if (err) return res.sendStatus(403);
                ret.token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                    expiresIn: "1h",
                });
            });
        }
        res.json(ret);
    }
};

module.exports = users;
