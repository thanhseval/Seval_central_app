const { Pool } = require('pg');
// Using environment variables to connect to the database
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const databaseFunctions = {
  /**
   * Function to create a table with the defined fields in the `options` object.
   * @async
   * @param {object} options - Object containing the necessary information to create the table.
   * @param {string} options.tableName - The name of the table to be created.
   * @param {Array} options.fields - An array of objects containing information about the fields of the table.
   * @returns {object} - The result of the function, including the `success` property to determine whether the operation was successful
   * and the `message` property containing the result message.
   */
  create: async (options) => {
    const { tableName, fields } = options;
    const fieldDefinitions = fields.map((field) => {
      const { name, type, notNull, primaryKey } = field;
      const fieldDefinition = `${name} ${type}${notNull ? " NOT NULL" : ""}${primaryKey ? " PRIMARY KEY" : ""}`;
      return fieldDefinition;
    });

    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      ${fieldDefinitions.join(",\n")}
    );
  `;

    try {
      const result = await pool.query(createTableQuery);
      return { success: true, message: `Bảng "${tableName}" đã được tạo thành công!` };
    } catch (error) {
      console.error('Lỗi khi tạo bảng:', error);
      return { success: false, message: 'Không thể tạo bảng.' };
    }
  },
  /**
   * The function performs a SELECT query on data from the table with information from the `options` object.
   * @async
   * @param {object} options - The object contains the information needed to execute the SELECT query.
   * @param {string} options.tableName - The name of the table to query.
   * @param {string} options.fields - String containing the field names to get data (comma separated).
   * @param {string} options.condition - Condition of the SELECT query (if any).
   * @returns {object} - The result of the function, including the `success`(boolean) attribute to determine success or not,
   * and the `data`(array) attribute contains the resulting array of data lines if successful.
   */
  select: async (options) => {
    const { tableName, fields, condition, orderBy } = options;

    let query = `SELECT ${fields} FROM ${tableName}`;
    if (condition) {
      if (Array.isArray(condition)) {
        const conditions = condition.join(' AND ');
        query += ` WHERE ${conditions}`;
      } else {
        query += ` WHERE ${condition}`;
      }
    }

    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }

    try {
      const results = await pool.query(query);
      return { success: true, data: results.rows };
    } catch (error) {
      console.error('Lỗi khi thực hiện truy vấn SELECT:', error);
      return { success: false, data: [] };
    }
  },
  /**
   * The function executes a SELECT query of all data from the table.
   * @async
   * @param {object} options - The object contains the information needed to execute the SELECT query.
   * @param {string} options.tableName - The name of the table to query.
   * @returns {object} - The result of the function, including the `success`(boolean) attribute to determine success or not,
   * and the `data`(array) attribute contains the resulting array of data lines if successful.
   */
  selectall: async (options) => {
    const { tableName } = options;
    const query = `SELECT * FROM ${tableName}`;

    try {
      const results = await pool.query(query);
      return { success: true, data: results.rows };
    } catch (error) {
      console.error('Lỗi khi thực hiện truy vấn SELECT:', error);
      return { success: false, data: [] };
    }
  },
  /**
   * Function to execute a custom SQL query with optional parameter values.
   * @async
   * @param {object} options - An object containing the query and optional parameter values.
   * @param {string} options.query - The SQL query to be executed.
   * @param {Array} [options.values=[]] - An array of values to be used as placeholders in the query (optional).
   * @returns {object} - The result of the function, including the `success` property to determine whether the operation was successful
   * and the `data` property containing the query result rows if successful, or an empty array if there was an error.
   */
  executeQuery: async (options) => {
    const { query, values = [] } = options;
    try {
      const result = await pool.query(query, values);
      return { success: true, data: result.rows };
    } catch (error) {
      console.error('Lỗi khi thực thi truy vấn:', error);
      return { success: false, data: [] };
    }
  },
  /**
   * The function performs an INSERT query of data into a table with information from the `options` object.
   * @async
   * @param {object} options - The object contains the information needed to insert data.
   * @param {string} options.tableName - Name of the table to insert data.
   * @param {object} options.data - The object contains information about the fields and data values to be inserted into the table.
   * @returns {object} - The result of the function, including the `success`(boolean) attribute to determine success or not
   * and the `message`(string) attribute contains the resulting message.

   */
  insert: async (options) => {
    const { tableName, data } = options;

    const columns = Object.keys(data);
    const values = Object.values(data);

    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const insertQuery = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

    try {
      const result = await pool.query(insertQuery, values);
      return { success: true, message: 'Insert thành công!' };
    } catch (error) {
      console.error('Lỗi khi thực hiện truy vấn INSERT:', error);
      return { success: false, message: 'Không thể Insert.' };
    }
  },
  /**
   * The function performs a DELETE query on data from a table with information from the `options` object.
   * @async
   * @param {object} options - The object contains the information needed to execute the DELETE query.
   * @param {string} options.tableName - Name of the table to delete data.
   * @param {string} options.condition - Condition of the DELETE query.
   * @returns {object} - The result of the function, including the `success`(boolean) attribute to determine success or not
   * and the `message`(string) attribute contains the resulting message.

   */
  delete: async (options) => {
    const { tableName, condition } = options;

    const deleteQuery = `DELETE FROM ${tableName} WHERE ${condition}`;

    try {
      const result = await pool.query(deleteQuery);
      return { success: true, message: ' Xóa thành công!' };
    } catch (error) {
      console.error('Lỗi khi thực hiện DELETE:', error);
      return { success: false, message: 'Không thể xóa.' };
    }
  },
  /**
   * The function performs an UPDATE query on the data in the table with information from the `options` object.
   * @async
   * @param {object} options - The object contains the information needed to execute the UPDATE query.
   * @param {string} options.tableName - Table name to update data.
   * @param {string} options.id - The id value of the line to update data.
   * @param {object} options.updatedFields - The object contains information about the fields to be updated and their new values.
   * @returns {object} - The result of the function, including the `success`(boolean) attribute to determine success or not
   * and the `message`(string) attribute contains the resulting message.
   */
  update: async (options) => {
    const { tableName, condition, updatedFields } = options;
    const fields = Object.keys(updatedFields);

    let updateQuery = `UPDATE ${tableName} SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(', ')}`;

    // Check if there is a condition provided
    if (condition) {
      const conditionFields = Object.keys(condition);
      const conditionQuery = conditionFields.map((field, index) => `${field} = $${fields.length + index + 1}`).join(' AND ');
      updateQuery += ` WHERE ${conditionQuery}`;
    }

    try {
      const result = await pool.query(updateQuery, [...Object.values(updatedFields), ...(condition ? Object.values(condition) : [])]);
      return { success: true, message: 'Bảng đã được cập nhật thành công!' };
    } catch (error) {
      console.error('Lỗi khi thực hiện UPDATE:', error);
      return { success: false, message: 'Không thể cập nhật bảng.' };
    }
  },
};

module.exports = databaseFunctions;