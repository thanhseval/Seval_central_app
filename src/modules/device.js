const databaseFunctions = require('../lib/libposgres');
const mqttClient = require('../lib/mqttClient'); // Import MQTT client
const moment = require('moment-timezone');
const device = {
  mqttcontrol: async (req, res) => {
    const { key, action } = req.body; // Đọc key và action từ body của yêu cầu

    // Địa chỉ MAC của PLC
    const plcMacAddress = '8C-F3-19-3B-2E-B9';

    // Tạo tên topic MQTT dựa trên địa chỉ MAC và key
    const mqttTopic = `${plcMacAddress}_RECEIVE_${key}`;

    // Console log thông tin mqttTopic và action
    console.log('mqttTopic:', mqttTopic);
    console.log('action:', action);

    // Gửi tín hiệu tới MQTT Broker
    mqttClient.publish(mqttTopic, action, err => {
      if (err) {
        console.error('Error publishing control signal:', err);
        res.json({ error: 'An error occurred while sending control signal.' });
      } else {
        console.log('Control signal sent successfully');

        // Trả về thông tin key và action trong object
        res.json({ key, action, message: 'Control signal sent successfully.' });
      }
    });
  },

  receiveData: async (req, res) => {
    try {
      const deviceId = req.params.deviceId; // Get DeviceID from URL
      const requestData = req.body;

      if (typeof requestData === 'object') {
        const { ts, data } = requestData;
        const time = moment.tz(req.body.ts, 'Asia/Ho_Chi_Minh').utc(); // Chuyển đổi sang múi giờ UTC

        if (!ts || !Array.isArray(data)) {
          return res.json({ success: false, message: 'Invalid request data. Each request must have "ts" and an array of "data".' });
        }
        const adjustedTs = moment(ts).subtract(7, 'hours');
        for (const item of data) {
          const { key, value } = item;
          let calculatedValue = null;

          const MinRData = await databaseFunctions.select({ tableName: 'system_config', fields: 'value', condition: "attribute='MinR'" });
          const MaxRData = await databaseFunctions.select({ tableName: 'system_config', fields: 'value', condition: "attribute='MaxR'" });
          const MinoData = await databaseFunctions.select({ tableName: 'system_config', fields: 'value', condition: "attribute='Mino'" });
          const MaxoData = await databaseFunctions.select({ tableName: 'system_config', fields: 'value', condition: "attribute='Maxo'" });
          if (!MinRData.success || MinRData.data.length === 0 || !MaxRData.success || MaxRData.data.length === 0 || !MinoData.success || MinoData.data.length === 0 || !MaxoData.success || MaxoData.data.length === 0) {
            return res.json({ success: false, message: 'Không thể lấy giá trị "MinR hoặc MaxR hoặc Mino hoặc Maxo" từ cơ sở dữ liệu', code: 'FAILED_RETRIEVE_A' });
          }

          const MinR = parseFloat(MinRData.data[0].value);
          const MaxR = parseFloat(MaxRData.data[0].value);
          const Mino = parseFloat(MinoData.data[0].value);
          const Maxo = parseFloat(MaxoData.data[0].value);
          // Kiểm tra xem 'a' có phải là một số hợp lệ hay không
          if (isNaN(MinR || MaxR || Mino || Maxo)) {
            return res.json({ success: false, message: 'Giá trị "MinR" hoặc "MaxR" hoặc "Mino" hoặc "Maxo" từ cơ sở dữ liệu không hợp lệ', code: 'INVALID_A' });
          }
          calculatedValue = value < 400 ? 0 : (((value - MinR) * ((Maxo - Mino) / (MaxR - MinR))) + Mino).toFixed(2);
          const add = {
            tableName: 'device_attribute',
            data: {
              device_id: deviceId,
              updated_at: time,
              attribute: key,
              value: calculatedValue,
            },
          };

          const insertResult = await databaseFunctions.insert(add);

          if (!insertResult.success) {
            return res.json({ success: false, message: 'Failed to save data to the database', code: 'FAILED_SAVE_DB' });
          }
        }

        res.json({ ts, data, message: '', code: '' });
      } else {
        res.json({ success: false, message: 'Invalid request data', code: 'INVALID_DATA' });
      }
    } catch (error) {
      console.error('Error saving data to the database:', error);
      res.json({ success: false, message: 'Failed to save data to the database', code: 'ERROR_SAVING_DB' });
    }
  },



  // Function to handle sending data to clients
  returnData: async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const keys = req.query.keys.split(','); // Chuyển keys thành mảng

      if (!deviceId || !keys) {
        res.json({
          success: false,
          message: 'The "deviceId" or "keys" parameters are required',
          code: 'MISSING_PARAMETERS'
        });
        return;
      }

      // Construct the condition for the query as an array
      const condition = [
        `device_id = '${deviceId}'`,
        `attribute IN ('${keys.join("','")}')`
      ];
      const orderBy = 'updated_at ASC';
      // Get data from the database using the select function with all fields and the specified condition
      const selectData = {
        tableName: 'device_attribute',
        fields: 'attribute,value,updated_at',
        condition: condition,
        orderBy: orderBy,
        limit: 1
      };

      const resultData = await databaseFunctions.select(selectData);

      if (resultData.success) {
        // Process the data to transform it into the desired JSON structure
        const responseData = {
          data: {},
          message: '',
          code: ''
        };

        resultData.data.forEach(item => {
          responseData.data[item.attribute] = {
            value: item.value === 'null' ? null : item.value,
            updated_at: item.updated_at,
          };
        });

        res.json(responseData);
      } else {
        res.json({
          success: false,
          message: resultData.message,
          code: 'FAILED_RETRIEVE_DB'
        });
      }
    } catch (error) {
      console.error('Error retrieving data from the database:', error);
      res.json({
        success: false,
        message: 'Failed to retrieve data from the database',
        code: 'ERROR_RETRIEVING_DB'
      });
    }
  },

  getData: async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const keys = req.query.keys.split(','); // Chuyển keys thành mảng
      const startTime = req.query.startTime; // Láº¥y thá»i gian báº¯t Ä‘áº§u tá»« Query Params
      const endTime = req.query.endTime; // Láº¥y thá»i gian káº¿t thÃºc tá»« Query Params

      // Kiá»ƒm tra xem cÃ¡c tham sá»‘ Ä‘Ã£ Ä‘Æ°á»£c cung cáº¥p hay khÃ´ng
      if (keys.length === 0 || !deviceId || !startTime || !endTime) {
        res.json({ code: 'MISSING_PARAMETERS', message: 'The "keys", "deviceId", "startTime", and "endTime" parameters are required' });
        return;
      }

      // Construct the condition for the query as an array
      const condition = [
        `device_id = '${deviceId}'`,
        `attribute IN ('${keys.join("','")}')`,
        `updated_at >= '${startTime}'`,
        `updated_at <= '${endTime}'`
      ];

      // Get data from the database using the select function with all fields and the specified condition
      const selectData = {
        tableName: 'device_attribute',
        fields: '*',
        condition: condition,
      };

      const resultData = await databaseFunctions.select(selectData);

      if (resultData.success) {
        // // Process the data to transform it into an array with a lot of values
        // const responseData = [];
        // for (const item of resultData.data) {
        //   responseData.push(item.value);
        // }
        const responseData = {};
        for (const item of resultData.data) {
          if (!responseData[item.attribute]) {
            responseData[item.attribute] = [];
          }

          responseData[item.attribute].push({
            value: item.value,
            updated_at: item.updated_at,
          });
        }


        res.json({ data: responseData, message: '', code: '' });

      } else {
        res.json({ code: 'FAILED_RETRIEVE_DB', message: resultData.message });
      }
    } catch (error) {
      console.error('Error retrieving data from the database:', error);
      res.json({ code: 'ERROR_RETRIEVING_DB', message: 'Failed to retrieve data from the database' });
    }
  },
  getAllDeviceId: async (req, res) => {
    try {

      // Get data from the database using the select function with all fields and the specified condition
      const selectData = {
        tableName: 'device',
        fields: '*',
      };

      const resultData = await databaseFunctions.select(selectData);
      if (resultData.success) {
        res.json({ data: resultData.data, message: '', code: '' });
      } else {
        res.json({ code: 'FAILED_RETRIEVE_DB', message: resultData.message });
      }
    } catch (error) {
      console.error('Error retrieving data from the database:', error);
      res.json({ code: 'ERROR_RETRIEVING_DB', message: 'Failed to retrieve data from the database' });
    }
  },


  // updateDeviceData function to handle updating data
  updateDeviceData: async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const requestData = req.body;

      // Convert requestData to an array if it is not already an array
      const dataArray = Array.isArray(requestData) ? requestData : [requestData];

      for (const deviceData of dataArray) {
        const { ts, data } = deviceData;

        // Check if the required fields 'ts' and 'data' exist in the request
        if (!deviceId || !ts || !data || typeof data !== 'object') {
          return res.json({ code: 'FAILED_UPDATE_DB', message: 'Invalid request data. Each item must have "deviceId","updated_at" and "data" properties.' });
        }

        // Convert the timestamp value to a Date object
        const updateDate = new Date(ts);

        // Update the data in the database based on the 'update_at' field
        for (const attribute in data) {
          if (data.hasOwnProperty(attribute)) {
            const value = data[attribute];

            // Update the data in the database
            const updateData = {
              tableName: 'device_attribute',
              condition: {
                device_id: deviceId,
                attribute: attribute,
                updated_at: updateDate
              },
              updatedFields: {

                value: value
              }
            };

            const updateResult = await databaseFunctions.update(updateData);

            if (!updateResult.success) {
              return res.json({ code: 'FAILED_UPDATE_DB', message: 'Failed to update data in the database' });
            }
          }
        }
      }
      return res.json({ message: '', code: '' });
    } catch (error) {
      console.error('Error updating data in the database:', error);
      return res.json({ code: "ERROR_UPDATING_DB", message: 'Failed to update data in the database' });
    }
  }
  ,
  updateProfile: async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const requestData = req.body;

      // Convert requestData to an array if it is not already an array
      const dataArray = Array.isArray(requestData) ? requestData : [requestData];

      for (const deviceData of dataArray) {
        const { device_label, device_type, device_description, firmware_version } = deviceData;

        // Check if the required fields exist in the data object
        if (!device_label || !device_type || !device_description || !firmware_version) {
          return res.json({ code: 'FAILED_UPDATE_DB', message: 'Invalid request data. "data" object must have "DeviceLabel", "DeviceType", "DeviceDescription", and "FirmwareVersion" properties.' });
        }

        // Update the data in the database based on the 'DeviceId' field
        const updateData = {
          tableName: 'device', // Replace 'device' with the name of your table
          condition: { device_id: deviceId }, // Use 'deviceId' as the condition to identify the data to update
          updatedFields: { device_label, device_type, device_description, firmware_version }, // Update fields from the 'deviceData' object
        };

        const updateResult = await databaseFunctions.update(updateData);

        if (!updateResult.success) {
          return res.json({ code: 'FAILED_UPDATE_DB', message: 'Failed to update data in the database' });
        }
      }

      return res.json({ message: '', code: '' });
    } catch (error) {
      console.error('Error updating data in the database:', error);
      return res.json({ code: "ERROR_UPDATING_DB", message: 'Failed to update data in the database' });
    }
  }
  ,
  updateConfigsystem: async (req, res) => {
    try {
      const requestData = req.body;

      // Convert requestData to an array if it is not already an array
      const dataArray = Array.isArray(requestData) ? requestData : [requestData];

      for (const deviceData of dataArray) {
        const { updated_at, data } = deviceData;

        // Check if the required fields 'updated_at' and 'data' exist in the request
        if (!updated_at || !data || typeof data !== 'object') {
          return res.json({ code: 'FAILED_UPDATE_DB', message: 'Invalid request data. Each item must have "updated_at" and "data" properties.' });
        }

        // Convert the timestamp value to a Date object
        const updateDate = new Date(updated_at);

        // Construct the list of attributes to be updated and their corresponding values
        const updateList = [];
        for (const attribute in data) {
          if (data.hasOwnProperty(attribute)) {
            const value = data[attribute];
            updateList.push({ attribute, value });
          }
        }

        // Update the data in the database based on the 'updated_at' field and attribute values
        for (const { attribute, value } of updateList) {
          // Update the data in the database
          const updateData = {
            tableName: 'system_config',
            condition: {
              attribute: attribute
            },
            updatedFields: {
              updated_at: updateDate,
              value: value
            }
          };

          const updateResult = await databaseFunctions.update(updateData);

          if (!updateResult.success) {
            return res.json({ code: "FAILED_UPDATE_DB", message: 'Failed to update data in the database' });
          }
        }
      }

      return res.json({ message: '', code: '' });
    } catch (error) {
      console.error('Error updating data in the database:', error);
      return res.json({ code: "ERROR_UPDATING_DB", message: 'Failed to update data in the database' });
    }
  },
  getconfig: async (req, res) => {
    try {
      const keys = req.query.keys.split(','); // Chuyá»ƒn keys thÃ nh máº£ng

      if (!keys || keys.length === 0) {
        res.json({ success: false, message: 'The "keys" parameter is required', code: 'MISSING_PARAMETERS' });
        return;
      }

      // Construct the condition for the query as an array
      const condition = [
        `attribute IN ('${keys.join("','")}')`
      ];

      // Get data from the database using the select function with all fields and the specified condition
      const selectData = {
        tableName: 'system_config',
        fields: '*',
        condition: condition,
      };

      const resultData = await databaseFunctions.select(selectData);

      if (resultData.success) {
        // Process the data to transform it into an object with attributes as keys
        const responseData = {};
        resultData.data.forEach(item => {
          responseData[item.attribute] = item.value;
        });

        res.json({ data: responseData, message: '', code: '' });
      } else {
        res.json({ success: false, message: resultData.message, code: 'FAILED_RETRIEVE_DB' });
      }
    } catch (error) {
      console.error('Error retrieving data from the database:', error);
      res.json({ success: false, message: 'Failed to retrieve data from the database', code: 'ERROR_RETRIEVING_DB' });
    }
  },
  getConfig: async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const keys = req.query.keys.split(','); // Chuyá»ƒn keys thÃ nh máº£ng

      if (!keys || keys.length === 0) {
        res.json({ success: false, message: 'The "keys" parameter is required', code: 'MISSING_PARAMETERS' });
        return;
      }

      // Construct the condition for the query as an array
      const condition = [
        `attribute IN ('${keys.join("','")}')`
      ];

      // Get data from the database using the select function with all fields and the specified condition
      const selectData = {
        tableName: 'system_config',
        fields: '*',
        condition: condition,
      };

      const resultData = await databaseFunctions.select(selectData);

      if (resultData.success) {
        // Process the data to transform it into an object with attributes as keys
        const responseData = {
          data: {},
          message: '',
          code: '',
        };
        resultData.data.forEach(item => {
          responseData.data[item.attribute] = item.value;
        });

        // Add deviceId to the response
        responseData.data['deviceId'] = deviceId;

        // Add mqtt_topic_sub to the response
        responseData.data['mqtt_topic_sub'] = `device/receive/${deviceId}`;
        responseData.data['mqtt_topic_pub'] = `device/send/${deviceId}`;

        // Sort the attributes in the response
        const sortedAttributes = Object.keys(responseData.data).sort();
        const sortedData = {};
        for (const attribute of sortedAttributes) {
          sortedData[attribute] = responseData.data[attribute];
        }
        responseData.data = sortedData;

        res.json(responseData);
      } else {
        res.json({ success: false, message: resultData.message, code: 'FAILED_RETRIEVE_DB' });
      }
    } catch (error) {
      console.error('Error retrieving data from the database:', error);
      res.json({ success: false, message: 'Failed to retrieve data from the database', code: 'ERROR_RETRIEVING_DB' });
    }
  },
  getDeviceBattery: async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const fieldsToRetrieve = req.query.fields;
      if (!fieldsToRetrieve) {
        res.json({ message: 'The "fields" parameter is required', code: 'MISSING_FIELDS' });
        return;
      }
      if (fieldsToRetrieve !== 'battery_voltage') {
        res.json({ message: 'Invalid field name. Only "battery_voltage" field is allowed', code: 'INVALID_FIELD_NAME' });
        return;
      }
      const conditionObject = { device_id: deviceId };
      const conditionKeys = Object.keys(conditionObject);
      const conditions = conditionKeys.map(key => `${key} = '${conditionObject[key]}'`);
      const conditionString = conditions.join(' AND ');
      const selectData = {
        tableName: 'device',
        fields: fieldsToRetrieve,
        condition: conditionString,
      };
      const resultData = await databaseFunctions.select(selectData);
      if (resultData.success) {
        if (resultData.data.length > 0) {
          const responseData = resultData.data[0];
          res.json({ data: responseData, message: '', code: '' });
        } else {
          res.json({ message: 'No data found for the specified device ID', code: 'NO_DATA_FOUND' });
        }
      } else {
        res.json({ message: resultData.message, code: 'FAILED_RETRIEVE_DB' });
      }
    } catch (error) {
      console.error('Error retrieving data from the database:', error);
      res.json({ message: 'Failed to retrieve data from the database', code: 'ERROR_RETRIEVING_DB' });
    }
  },
  getDeviceConfig: async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const fieldsToRetrieve = req.query.fields;
      if (!fieldsToRetrieve) {
        res.json({ message: 'The "fields" parameter is required', code: 'MISSING_FIELDS' });
        return;
      }
      const requestedFields = fieldsToRetrieve.split(',');
      const allowedFields = ['baudrate', 'frame_format', 'byte_send', 'byte_order', 'poll_period'];
      const invalidFields = requestedFields.filter(field => !allowedFields.includes(field));
      if (invalidFields.length > 0) {
        res.json({ message: `Invalid field name(s): ${invalidFields.join(', ')}`, code: 'INVALID_FIELD_NAME' });
        return;
      }
      const selectData = {
        tableName: 'device',
        fields: requestedFields.join(','),
        condition: `device_id = '${deviceId}'`,
      };
      const resultData = await databaseFunctions.select(selectData);

      if (resultData.success) {
        const currentTime = new Date().toLocaleString();
        if (resultData.data.length > 0) {
          const responseData = resultData.data[0];
          res.json({ data: responseData, message: '', code: '' });
        } else {
          res.json({ message: 'No data found for the specified device ID', code: 'NO_DATA_FOUND' });
        }
      } else {
        res.json({ message: resultData.message, code: 'FAILED_RETRIEVE_DB' });
      }
    } catch (error) {
      console.error('Error retrieving data from the database:', error);
      res.json({ message: 'Failed to retrieve data from the database', code: 'ERROR_RETRIEVING_DB' });
    }
  },
  getDeviceProfile: async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const fieldsToRetrieve = req.query.fields;
      if (!fieldsToRetrieve) {
        res.json({ message: ' The "fields" parameter is required', code: 'MISSING_FIELDS' });
        return;
      }
      const validFields = ['device_label', 'device_type', 'device_description', 'firmware_version', 'date_taken', 'time_taken'];
      const invalidFields = fieldsToRetrieve.split(',').filter(field => !validFields.includes(field.trim()));
      if (invalidFields.length > 0) {
        res.json({ message: `Invalid fields name: ${invalidFields.join(', ')}`, code: 'INVALID_FIELD_NAME' });
        return;
      }
      const selectData = {
        tableName: 'device',
        fields: fieldsToRetrieve,
        condition: `device_id = '${deviceId}'`,
      };
      const resultData = await databaseFunctions.select(selectData);
      if (resultData.success) {
        const currentTime = new Date().toLocaleString();
        if (resultData.data.length > 0) {
          const responseData = resultData.data[0];
          res.json({ data: responseData, message: '', code: '' });
        } else {
          res.json({ message: 'No data found for specific device code', code: 'NO_DATA_FOUND' });
        }
      } else {
        res.json({ message: resultData.message, code: 'FAILED_RETRIEVE_DB' });
      }
    } catch (error) {
      console.error('Error retrieving data from database:', error);
      res.json({ message: 'Unable to retrieve data from database', code: 'ERROR_RETRIEVING_DB' });
    }
  },
  updateDeviceConfig: async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const requestData = req.body;

      const dataArray = Array.isArray(requestData) ? requestData : [requestData];
      for (const deviceData of dataArray) {
        const { baudrate, frame_format, byte_send, byte_order, poll_period } = deviceData;


        if (!baudrate || !frame_format || !byte_send || !byte_order || !poll_period) {
          return res.json({ message: 'Invalid request data. "data" object must have "battery_voltage" property.' });
        }
        const updateData = {
          tableName: 'device',
          condition: { device_id: deviceId }, // Use 'deviceId' as the condition to identify the data to update
          updatedFields: { baudrate, frame_format, byte_send, byte_order, poll_period }, // Update only the "battery_voltage" field from the 'deviceData' object
        };

        const updateResult = await databaseFunctions.update(updateData);

        if (!updateResult.success) {
          return res.json({ message: 'Failed to update data in the database', code: 'FAILED_UPDATE_DB' });
        }
      }

      return res.json({ message: '', code: '' });
    } catch (error) {
      console.error('Error updating data in the database:', error);
      return res.json({ message: 'Failed to update data in the database', code: 'ERROR_UPDATING_DB' });
    }
  },
  updateDeviceBattery: async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const requestData = req.body;
      const dataArray = Array.isArray(requestData) ? requestData : [requestData];

      for (const deviceData of dataArray) {
        const { battery_voltage } = deviceData;

        if (!battery_voltage) {
          return res.json({ message: 'Invalid request data. "data" object must have "battery_voltage" property.' });
        }
        const updateData = {
          tableName: 'device',
          condition: { device_id: deviceId },
          updatedFields: { battery_voltage },
        };
        const updateResult = await databaseFunctions.update(updateData);
        if (!updateResult.success) {
          return res.json({ message: 'Failed to update data in the database', code: 'FAILED_UPDATE_DB' });
        }
      }
      return res.json({ message: '', code: '' });
    } catch (error) {
      console.error('Error updating data in the database:', error);
      return res.json({ message: 'Failed to update data in the database', code: 'ERROR_UPDATING_DB' });
    }
  },
  getalll: async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const attributes = req.query.attribute; // Đọc giá trị điều kiện từ query parameter

      if (!attributes) {
        res.json({ message: 'The "attribute" parameter is required', code: 'MISSING_ATTRIBUTE' });
        return;
      }

      // Chuyển giá trị của attribute thành mảng
      const attributeArray = attributes.split(',');

      // Tạo mảng các điều kiện OR cho trường attribute
      const attributeConditions = attributeArray.map(attribute => `attribute = '${attribute}'`);
      const attributeConditionString = attributeConditions.join(' OR ');

      const conditionObject = { device_id: deviceId };
      const conditionKeys = Object.keys(conditionObject);
      const conditions = conditionKeys.map(key => `${key} = '${conditionObject[key]}'`);
      conditions.push(`(${attributeConditionString})`); // Thêm điều kiện OR cho attribute
      const conditionString = conditions.join(' AND ');

      const selectData = {
        tableName: 'device_attribute', // Sửa tên bảng thành 'device_attribute'
        fields: 'attribute, value, updated_at', // Lấy trường 'attribute', 'value', và 'updated_at'
        condition: conditionString,

      };

      const resultData = await databaseFunctions.select(selectData);

      if (resultData.success) {
        if (resultData.data.length > 0) {
          // Tạo đối tượng chứa dữ liệu phân biệt theo giá trị attribute
          const responseData = {};
          resultData.data.forEach(item => {
            const { attribute, value, updated_at } = item;
            if (!responseData[attribute]) {
              responseData[attribute] = [];
            }
            responseData[attribute].push({ value, updated_at });
          });

          res.json({ data: responseData, message: '', code: '' });
        } else {
          res.json({ message: 'No data found for the specified device ID and attributes', code: 'NO_DATA_FOUND' });
        }
      } else {
        res.json({ message: resultData.message, code: 'FAILED_RETRIEVE_DB' });
      }
    } catch (error) {
      console.error('Error retrieving data from the database:', error);
      res.json({ message: 'Failed to retrieve data from the database', code: 'ERROR_RETRIEVING_DB' });
    }
  },
  getStatus: async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const keys = req.query.keys.split(','); // Chuyển keys thành mảng

      if (!deviceId || !keys) {
        res.json({
          success: false,
          message: 'The "deviceId" or "keys" parameters are required',
          code: 'MISSING_PARAMETERS'
        });
        return;
      }

      // Construct the condition for the query as an array
      const condition = [
        `device_id = '${deviceId}'`,
        `attribute IN ('${keys.join("','")}')`
      ];
      const orderBy = 'updated_at ASC';
      // Get data from the database using the select function with all fields and the specified condition
      const selectData = {
        tableName: 'device_attribute',
        fields: 'attribute,status,updated_at',
        condition: condition,
        orderBy: orderBy,
        limit: 1


      };

      const resultData = await databaseFunctions.select(selectData);

      if (resultData.success) {
        // Process the data to transform it into the desired JSON structure
        const responseData = {
          data: {},
          message: '',
          code: ''
        };

        resultData.data.forEach(item => {
          responseData.data[item.attribute] = {
            status: item.status,
            updated_at: item.updated_at,
          };
        });

        res.json(responseData);
      } else {
        res.json({
          success: false,
          message: resultData.message,
          code: 'FAILED_RETRIEVE_DB'
        });
      }
    } catch (error) {
      console.error('Error retrieving data from the database:', error);
      res.json({
        success: false,
        message: 'Failed to retrieve data from the database',
        code: 'ERROR_RETRIEVING_DB'
      });
    }
  },
  send: async (req, res) => {
    try {
      const deviceId = req.params.deviceId; // Get DeviceID from URL
      const requestData = req.body;
      console.log(deviceId);

      if (typeof requestData === 'object') {
        const { ts, data } = requestData;

        if (!ts || (!Array.isArray(data) && typeof data !== 'object')) {
          return res.json({ success: false, message: 'Invalid request data. "ts" must be provided and "data" must be an object or an array.' });
        }

        const successResponses = [];
        const errorResponses = [];

        const dataArray = Array.isArray(data) ? data : [data];

        for (const item of dataArray) {
          if (typeof item !== 'object') {
            errorResponses.push({ ts, data: item, success: false, message: 'Invalid item in the data array. Each item must be an object.' });
            continue;
          }
          let calculatedValue = null;
          const { key, value, status } = item;
          console.log(value);
          if (typeof value !== 'undefined') {
            if (value < 0) {
              calculatedValue = 0;
            } else {
              calculatedValue = value.toFixed(2);
            }
          }
          const add = {
            tableName: 'device_attribute',
            data: {
              device_id: deviceId,
              updated_at: new Date(ts),
              attribute: key,
              value: calculatedValue,
              status: status,
            },
          };
          const insertResult = await databaseFunctions.insert(add);

          if (insertResult.success) {
            successResponses.push({ ts, data: item, success: true, message: '', code: '' });
          } else {
            errorResponses.push({ ts, data: item, success: false, message: 'Failed to save data to the database', code: 'FAILED_SAVE_DB' });
          }
        }

        const response = {
          successResponses,
        };

        res.json(response);
      } else {
        res.json({ success: false, message: 'Invalid request data', code: 'INVALID_DATA' });
      }
    } catch (error) {
      console.error('Error saving data to the database:', error);
      res.json({ success: false, message: 'Failed to save data to the database', code: 'ERROR_SAVING_DB' });
    }
  },
  mqttControlIot: async (req, res) => {

    const { action } = req.body; // Đọc key và action từ body của yêu cầu
    // const plcMacAddress = 'Device001'
    const plcMacAddress = req.params.deviceId;


    // Tạo tên topic MQTT dựa trên địa chỉ MAC và key
    const mqttTopic = `device/receive/${plcMacAddress}`;

    // Console log thông tin mqttTopic và action
    console.log('mqttTopic:', mqttTopic);
    console.log('action:', action);

    // Gửi tín hiệu tới MQTT Broker
    mqttClient.publish(mqttTopic, action, err => {
      if (err) {
        console.error('Error publishing control signal:', err);
        res.json({ error: 'An error occurred while sending control signal.' });
      } else {
        console.log('Control signal sent successfully');

        // Trả về thông tin key và action trong object
        res.json({ action, message: 'Control signal sent successfully.' });
      }
    });
  },
  mqttControlIot004: async (req, res) => {

    const { action } = req.body; // Đọc key và action từ body của yêu cầu
    const plcMacAddress = 'Device004'


    // Tạo tên topic MQTT dựa trên địa chỉ MAC và key
    const mqttTopic = `device/receive/${plcMacAddress}`;

    // Console log thông tin mqttTopic và action
    console.log('mqttTopic:', mqttTopic);
    console.log('action:', action);

    // Gửi tín hiệu tới MQTT Broker
    mqttClient.publish(mqttTopic, action, err => {
      if (err) {
        console.error('Error publishing control signal:', err);
        res.json({ error: 'An error occurred while sending control signal.' });
      } else {
        console.log('Control signal sent successfully');

        // Trả về thông tin key và action trong object
        res.json({ action, message: 'Control signal sent successfully.' });
      }
    });
  },
  mqttControlIot005: async (req, res) => {

    const { action } = req.body; // Đọc key và action từ body của yêu cầu
    const plcMacAddress = 'Device005'


    // Tạo tên topic MQTT dựa trên địa chỉ MAC và key
    const mqttTopic = `device/receive/${plcMacAddress}`;

    // Console log thông tin mqttTopic và action
    console.log('mqttTopic:', mqttTopic);
    console.log('action:', action);

    // Gửi tín hiệu tới MQTT Broker
    mqttClient.publish(mqttTopic, action, err => {
      if (err) {
        console.error('Error publishing control signal:', err);
        res.json({ error: 'An error occurred while sending control signal.' });
      } else {
        console.log('Control signal sent successfully');

        // Trả về thông tin key và action trong object
        res.json({ action, message: 'Control signal sent successfully.' });
      }
    });
  },
  mqttControlIot003: async (req, res) => {

    const { action } = req.body; // Đọc key và action từ body của yêu cầu
    const plcMacAddress = 'Device003'


    // Tạo tên topic MQTT dựa trên địa chỉ MAC và key
    const mqttTopic = `device/receive/${plcMacAddress}`;

    // Console log thông tin mqttTopic và action
    console.log('mqttTopic:', mqttTopic);
    console.log('action:', action);

    // Gửi tín hiệu tới MQTT Broker
    mqttClient.publish(mqttTopic, action, err => {
      if (err) {
        console.error('Error publishing control signal:', err);
        res.json({ error: 'An error occurred while sending control signal.' });
      } else {
        console.log('Control signal sent successfully');

        // Trả về thông tin key và action trong object
        res.json({ action, message: 'Control signal sent successfully.' });
      }
    });
  },
  getScheduleData: async (req, res) => {
    try {
      // Get data from the database using the select function
      const selectData = {
        tableName: 'time_status',
        fields: '*',
      };
      const resultData = await databaseFunctions.select(selectData);

      if (resultData.success) {
        if (resultData.data.length > 0) {
          // Return the retrieved data from the database as an array
          res.json(resultData.data);
        } else {
          // If no data is found for the specified device ID, respond with a failure message
          res.json({ success: false, message: 'No data found for the specified device ID', code: 'NO_DATA_FOUND' });
        }
      } else {
        // Respond with failure message if data retrieval from the database fails
        res.json({ success: false, message: resultData.message, code: 'FAILED_RETRIEVE_DB' });
      }
    } catch (error) {
      // Respond with failure message if an error occurs during data retrieval or processing
      console.error('Error retrieving data from the database:', error);
      res.json({ success: false, message: 'Failed to retrieve data from the database', code: 'ERROR_RETRIEVING_DB' });
    }
  },
  updateOrCreateSchedule: async (req, res) => {
    const { name, startTime, endTime } = req.body;
    try {

      // Nếu chưa tồn tại, tạo một lịch trình mới
      const insertData = {
        tableName: 'time_status',
        data: {
          name: name,
          start_time: startTime,
          end_time: endTime,
        },
      };
      const insertResult = await databaseFunctions.insert(insertData);

      if (!insertResult.success) {
        return res.status(500).json({ message: 'Lỗi khi cập nhật dữ liệu.' });
      }
      else {
        res.json({ message: 'thêm lịch trình và bảng time_status thành công!' });
      }
    }

    catch (error) {
      console.error('Lỗi khi thêm dữ liệu:', error);
      res.status(500).json({ message: 'Lỗi khi thêm dữ liệu.' });
    }
  },
  deleteTime: async (req, res) => {
    const { name, startTime } = req.body;

    try {
      // Tạo điều kiện để xóa dữ liệu dựa trên startTime
      const condition = `start_time = '${startTime}' AND name = '${name}'`;



      const table = 'time_status';
      const deleteOptions = {
        tableName: table,
        condition: condition,
      };

      // Gọi hàm delete để thực hiện xóa dữ liệu
      const deleteResult = await databaseFunctions.delete(deleteOptions);

      if (!deleteResult.success) {
        return res.json({ message: 'Lỗi khi xóa dữ liệu.' });
      } else {
        // Trả về thông báo xóa thành công nếu thành công
        res.json({ message: 'Xóa lịch trình của bảng time_status thành công!' });
      }
    } catch (error) {
      console.error('Lỗi khi thực hiện DELETE:', error);
      res.json({ success: false, message: 'Không thể xóa.' });
    }
  },
  updateOrCreateSchedule: async (req, res) => {
    const { name, startTime, endTime } = req.body;
    try {
      const condition = `name = '${name}'`; // Sử dụng chuỗi bình thường cho điều kiện SQL
      // Kiểm tra xem lịch trình đã tồn tại trong cơ sở dữ liệu chưa
      const existingSchedule = await databaseFunctions.select({
        tableName: 'time_status',
        fields: '*',
        condition: condition,
      });

      if (existingSchedule.success) {
        if (existingSchedule.data.length > 0) {
          // Nếu đã tồn tại, cập nhật thời gian bắt đầu và kết thúc
          const updateData = {
            tableName: 'time_status',
            condition: { name: name },
            updatedFields: {
              start_time: startTime,
              end_time: endTime,
            },
          };
          const updateResult = await databaseFunctions.update(updateData);

          if (!updateResult.success) {
            return res.status(500).json({ message: 'Lỗi khi cập nhật dữ liệu.' });
          }
        } else {
          // Nếu chưa tồn tại, tạo một lịch trình mới
          const insertData = {
            tableName: 'time_status',
            data: {
              name: name,
              start_time: startTime,
              end_time: endTime,
            },
          };
          const insertResult = await databaseFunctions.insert(insertData);

          if (!insertResult.success) {
            return res.status(500).json({ message: 'Lỗi khi cập nhật dữ liệu.' });
          }
        }

        res.json({ message: 'Cập nhật lịch trình và bảng time_status thành công!' });
      } else {
        console.error('Lỗi khi thực hiện truy vấn SELECT:', existingSchedule.message);
        res.status(500).json({ message: 'Lỗi khi cập nhật dữ liệu.' });
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật dữ liệu:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật dữ liệu.' });
    }
  },

  insertThreshold: async (req, res) => {
    const { th1, ss1, th2, ss2 } = req.body;
    try {

      // Nếu chưa tồn tại, tạo một lịch trình mới
      const insertData = {
        tableName: 'threshold',
        data: {
          th1: th1,
          ss1: ss1,
          th2: th2,
          ss2: ss2,
        },
      };
      const insertResult = await databaseFunctions.insert(insertData);

      if (!insertResult.success) {
        return res.status(500).json({ message: 'Lỗi khi cập nhật dữ liệu.' });
      }
      else {
        res.json({ message: 'thêm ngưỡng và bảng threshold thành công!' });
      }
    }

    catch (error) {
      console.error('Lỗi khi thêm dữ liệu:', error);
      res.status(500).json({ message: 'Lỗi khi thêm dữ liệu.' });
    }
  },
  getThreshold: async (req, res) => {
    try {
      // Get data from the database using the select function
      const selectData = {
        tableName: 'threshold',
        fields: '*',
      };
      const resultData = await databaseFunctions.select(selectData);

      if (resultData.success) {
        if (resultData.data.length > 0) {
          // Return the retrieved data from the database as an array
          res.json(resultData.data);
        } else {
          // If no data is found for the specified device ID, respond with a failure message
          res.json({ success: false, message: 'No data found for the specified device ID', code: 'NO_DATA_FOUND' });
        }
      } else {
        // Respond with failure message if data retrieval from the database fails
        res.json({ success: false, message: resultData.message, code: 'FAILED_RETRIEVE_DB' });
      }
    } catch (error) {
      // Respond with failure message if an error occurs during data retrieval or processing
      console.error('Error retrieving data from the database:', error);
      res.json({ success: false, message: 'Failed to retrieve data from the database', code: 'ERROR_RETRIEVING_DB' });
    }
  },
  updateThreshold: async (req, res) => {
    const { id, th1, ss1, th2, ss2 } = req.body;
    try {
      const condition = `id = '${id}'`; // Sử dụng chuỗi bình thường cho điều kiện SQL
      // Kiểm tra xem lịch trình đã tồn tại trong cơ sở dữ liệu chưa
      const existingSchedule = await databaseFunctions.select({
        tableName: 'threshold',
        fields: '*',
        condition: condition,
      });

      if (existingSchedule.success) {
        if (existingSchedule.data.length > 0) {
          // Nếu đã tồn tại, cập nhật thời gian bắt đầu và kết thúc
          const updateData = {
            tableName: 'threshold',
            condition: { id: id },
            updatedFields: {
              th1: th1,
              ss1: ss1,
              th2: th2,
              ss2: ss2,
            },
          };
          const updateResult = await databaseFunctions.update(updateData);

          if (!updateResult.success) {
            return res.status(500).json({ message: 'Lỗi khi cập nhật dữ liệu.' });
          }
        } else {
          // Nếu chưa tồn tại, tạo một lịch trình mới
          const insertData = {
            tableName: 'threshold',
            data: {
              th1: th1,
              ss1: ss1,
              th2: th2,
              ss2: ss2,
            },
          };
          const insertResult = await databaseFunctions.insert(insertData);

          if (!insertResult.success) {
            return res.status(500).json({ message: 'Lỗi khi cập nhật dữ liệu.' });
          }
        }

        res.json({ message: 'Cập nhật lịch trình và bảng time_status thành công!' });
      } else {
        console.error('Lỗi khi thực hiện truy vấn SELECT:', existingSchedule.message);
        res.status(500).json({ message: 'Lỗi khi cập nhật dữ liệu.' });
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật dữ liệu:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật dữ liệu.' });
    }
  },
  getAllDeviceLocation: async (req, res) => {
    try {
      // Get data from the database using the select function
      const selectData = {
        tableName: 'device_location',
        fields: '*',
      };
      const resultData = await databaseFunctions.select(selectData);

      if (resultData.success) {
        if (resultData.data.length > 0) {
          // Return the retrieved data from the database as an array
          res.json(resultData.data);
        } else {
          // If no data is found for the specified device ID, respond with a failure message
          res.json({ success: false, message: 'No data found for the specified device ID', code: 'NO_DATA_FOUND' });
        }
      } else {
        // Respond with failure message if data retrieval from the database fails
        res.json({ success: false, message: resultData.message, code: 'FAILED_RETRIEVE_DB' });
      }
    } catch (error) {
      // Respond with failure message if an error occurs during data retrieval or processing
      console.error('Error retrieving data from the database:', error);
      res.json({ success: false, message: 'Failed to retrieve data from the database', code: 'ERROR_RETRIEVING_DB' });
    }
  },

};

module.exports = device;