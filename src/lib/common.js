const common = {

    /**
     * Get Integer value of a value
     * @param {string} val
     * @param {number} defVal
     * @returns
     */
    getInt: (val, defVal) => {
        try {
            return parseInt(val, 10);
        } catch (e) {
            console.error(e);
        }
        return defVal || 0;
    },

    /**
     * Get Integer value of a value
     * @param {string} val
     * @param {number} defVal
     * @returns
     */
    getBoolean: (val, defVal) => {
        try {
            return val == 1 || val == 'true' || val == true;
        } catch (e) {
            console.error(e);
        }
        return defVal || 0;
    }
};

module.exports = common;