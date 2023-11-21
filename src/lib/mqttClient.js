const mqtt = require('mqtt');
const express = require('express');
const bodyParser = require('body-parser');
const databaseFunctions = require('./libposgres');
const app = express();
const moment = require('moment-timezone');

const mqttBroker = "seval.ddns.net";
const mqttPort = 1883;
const mqttUsername = "thanh";
const mqttPassword = "thanhnguyen";

const mqttClient = mqtt.connect(`mqtt://${mqttBroker}:${mqttPort}`, {
  username: mqttUsername,
  password: mqttPassword,
});
app.use(bodyParser.json());
const topicToDeviceIdMap = {
  'device/Device001': 'Device001',
  'device/Device002': 'Device002',
  'device/send/Device003': 'Device003',
  'device/send/Device004': 'Device004',
  'device/send/Device005': 'Device005',
  // Thêm các ánh xạ khác tại đây nếu cần
};

// Sự kiện khi kết nối thành công
mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  // Subscribe vào tất cả các topic
  for (const topic in topicToDeviceIdMap) {
    mqttClient.subscribe(topic);
  }
});

// Sự kiện khi nhận được tin nhắn từ MQTT topic
mqttClient.on('message', async (topic, message) => {
  const currentTime = moment().format();
  const deviceId = topicToDeviceIdMap[topic];
  //console.log(`Received message on topic ${topic}: ${message.toString()}`);
  const value = message.toString();
  console.log(value);

  try {
    const parsedValue = JSON.parse(value);
    const ts = parsedValue.ts;
    const data = parsedValue.data;

    const time = moment.tz(ts, 'Asia/Ho_Chi_Minh').utc(); // Chuyển đổi sang múi giờ UTC
    const adjustedTs = moment(currentTime).add(7, 'hours');
    console.log('Adjusted Timestamp (ts):', time);

    for (const item of data) {
      const key = item.key;
      const itemValue = item.value;
      console.log('Key:', key);
      console.log('Value:', itemValue);
      if (!isNaN(itemValue) && deviceId == 'Device001') {
        if (key == 'Bat') {
          let battery = null;
          if (itemValue > 100) {
            battery = 100;
          } else {
            battery = itemValue;
          }
          const add = {
            tableName: 'device_attribute',
            data: {
              device_id: deviceId,
              updated_at: adjustedTs,
              attribute: key,
              value: battery, // Lưu secondPart dưới dạng chuỗi
            },
          };

          try {
            const result = await databaseFunctions.insert(add);
            if (result.success) {
              console.log('Data saved successfully');
            } else {
              console.log('Failed to save data to the database:', result.error);
            }
          } catch (error) {
            console.error('Database query error:', error);
          }
        }
        else if (key == 'PI_1' || key == 'PI_2') {
          const aValue = await databaseFunctions.select({ tableName: 'system_config', fields: 'value', condition: "attribute='MinR'" });
          if (!aValue.success === 0) {
            return res.json({ success: false, message: 'Không thể lấy giá trị "MinR hoặc MaxR hoặc Mino hoặc Maxo" từ cơ sở dữ liệu', code: 'FAILED_RETRIEVE_A' });
          }
          const a = parseFloat(aValue.data[0].value);
          if (isNaN(a)) {
            return res.json({ success: false, message: 'Giá trị "MinR" hoặc "MaxR" hoặc "Mino" hoặc "Maxo" từ cơ sở dữ liệu không hợp lệ', code: 'INVALID_A' });
          }
          calculatedValue = (itemValue / a).toFixed(2);
          const add = {
            tableName: 'device_attribute',
            data: {
              device_id: deviceId,
              updated_at: adjustedTs,
              attribute: key,
              value: calculatedValue, // Lưu secondPart dưới dạng chuỗi
            },
          };

          try {
            const result = await databaseFunctions.insert(add);
            if (result.success) {
              console.log('Data saved successfully');
            } else {
              console.log('Failed to save data to the database:', result.error);
            }
          } catch (error) {
            console.error('Database query error:', error);
          }
        }
        else {
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

          calculatedValue = itemValue < 400 ? 0 : (((itemValue - MinR) * ((Maxo - Mino) / (MaxR - MinR))) + Mino).toFixed(2);
          const add = {
            tableName: 'device_attribute',
            data: {
              device_id: deviceId,
              updated_at: adjustedTs,
              attribute: key,
              value: calculatedValue, // Lưu secondPart dưới dạng chuỗi
            },
          };

          try {
            const result = await databaseFunctions.insert(add);
            if (result.success) {
              console.log('Data saved successfully');
            } else {
              console.log('Failed to save data to the database:', result.error);
            }
          } catch (error) {
            console.error('Database query error:', error);
          }
        }
      }
      else if (isNaN(itemValue) && deviceId == 'Device001') {

        const add = {
          tableName: 'device_attribute',
          data: {
            device_id: deviceId,
            updated_at: adjustedTs,
            attribute: key,
            status: itemValue, // Lưu secondPart dưới dạng chuỗi
          },
        };

        try {
          const result = await databaseFunctions.insert(add);
          if (result.success) {
            console.log('Data saved successfully');
          } else {
            console.log('Failed to save data to the database:', result.error);
          }
        } catch (error) {
          console.error('Database query error:', error);
        }
      }
      else if (!isNaN(itemValue) && deviceId == 'Device003') {
        if (key == 'Bat') {
          let battery = null;
          if (itemValue > 100) {
            battery = 100;
          } else {
            battery = itemValue;
          }
          const add = {
            tableName: 'device_attribute',
            data: {
              device_id: deviceId,
              updated_at: adjustedTs,
              attribute: key,
              value: battery, // Lưu secondPart dưới dạng chuỗi
            },
          };

          try {
            const result = await databaseFunctions.insert(add);
            if (result.success) {
              console.log('Data saved successfully');
            } else {
              console.log('Failed to save data to the database:', result.error);
            }
          } catch (error) {
            console.error('Database query error:', error);
          }
        }
        else if (key == 'PI_1' || key == 'PI_2') {
          const aValue = await databaseFunctions.select({ tableName: 'system_config', fields: 'value', condition: "attribute='MinR'" });
          if (!aValue.success === 0) {
            return res.json({ success: false, message: 'Không thể lấy giá trị "MinR hoặc MaxR hoặc Mino hoặc Maxo" từ cơ sở dữ liệu', code: 'FAILED_RETRIEVE_A' });
          }
          const a = parseFloat(aValue.data[0].value);
          if (isNaN(a)) {
            return res.json({ success: false, message: 'Giá trị "MinR" hoặc "MaxR" hoặc "Mino" hoặc "Maxo" từ cơ sở dữ liệu không hợp lệ', code: 'INVALID_A' });
          }
          calculatedValue = (itemValue / a).toFixed(2);
          const add = {
            tableName: 'device_attribute',
            data: {
              device_id: deviceId,
              updated_at: adjustedTs,
              attribute: key,
              value: calculatedValue, // Lưu secondPart dưới dạng chuỗi
            },
          };

          try {
            const result = await databaseFunctions.insert(add);
            if (result.success) {
              console.log('Data saved successfully');
            } else {
              console.log('Failed to save data to the database:', result.error);
            }
          } catch (error) {
            console.error('Database query error:', error);
          }
        }
        else {
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

          calculatedValue = itemValue < 400 ? 0 : (((itemValue - MinR) * ((Maxo - Mino) / (MaxR - MinR))) + Mino).toFixed(2);
          if (calculatedValue <= 0.3) {
            calculatedValue = 0.00;
          } else if (calculatedValue > 0.3) {
            calculatedValue -= 0.3.toFixed(2);
          }
          calculatedValue = calculatedValue.toFixed(2);
          const add = {
            tableName: 'device_attribute',
            data: {
              device_id: deviceId,
              updated_at: adjustedTs,
              attribute: key,
              value: calculatedValue, // Lưu secondPart dưới dạng chuỗi
            },
          };

          try {
            const result = await databaseFunctions.insert(add);
            if (result.success) {
              console.log('Data saved successfully');
            } else {
              console.log('Failed to save data to the database:', result.error);
            }
          } catch (error) {
            console.error('Database query error:', error);
          }
        }
      }
      else if (isNaN(itemValue) && deviceId == 'Device003') {

        // if (key = 'DI_1_485') {
        //   const add1 = {
        //     tableName: 'device_attribute',
        //     data: {
        //       device_id: deviceId,
        //       updated_at: adjustedTs,
        //       attribute: key,
        //       value: itemValue, // Lưu secondPart dưới dạng chuỗi
        //     },
        //   };

        //   try {
        //     const result = await databaseFunctions.insert(add1);
        //     if (result.success) {
        //       console.log('Data saved successfully');
        //     } else {
        //       console.log('Failed to save data to the database:', result.error);
        //     }
        //   } catch (error) {
        //     console.error('Database query error:', error);
        //   }
        // } else {
        const add = {
          tableName: 'device_attribute',
          data: {
            device_id: deviceId,
            updated_at: adjustedTs,
            attribute: key,
            status: itemValue, // Lưu secondPart dưới dạng chuỗi
          },
        };

        try {
          const result = await databaseFunctions.insert(add);
          if (result.success) {
            console.log('Data saved successfully');
          } else {
            console.log('Failed to save data to the database:', result.error);
          }
        } catch (error) {
          console.error('Database query error:', error);
        }
        // }
      }
      else if (!isNaN(itemValue) && deviceId == 'Device004') {
        if (key == 'Bat') {
          let battery = null;
          if (itemValue > 100) {
            battery = 100;
          } else {
            battery = itemValue;
          }
          const add = {
            tableName: 'device_attribute',
            data: {
              device_id: deviceId,
              updated_at: adjustedTs,
              attribute: key,
              value: battery, // Lưu secondPart dưới dạng chuỗi
            },
          };

          try {
            const result = await databaseFunctions.insert(add);
            if (result.success) {
              console.log('Data saved successfully');
            } else {
              console.log('Failed to save data to the database:', result.error);
            }
          } catch (error) {
            console.error('Database query error:', error);
          }
        }
        else if (key == 'PI_1' || key == 'PI_2') {
          const aValue = await databaseFunctions.select({ tableName: 'system_config', fields: 'value', condition: "attribute='MinR'" });
          if (!aValue.success === 0) {
            return res.json({ success: false, message: 'Không thể lấy giá trị "MinR hoặc MaxR hoặc Mino hoặc Maxo" từ cơ sở dữ liệu', code: 'FAILED_RETRIEVE_A' });
          }
          const a = parseFloat(aValue.data[0].value);
          if (isNaN(a)) {
            return res.json({ success: false, message: 'Giá trị "MinR" hoặc "MaxR" hoặc "Mino" hoặc "Maxo" từ cơ sở dữ liệu không hợp lệ', code: 'INVALID_A' });
          }
          calculatedValue = (itemValue / a).toFixed(2);
          const add = {
            tableName: 'device_attribute',
            data: {
              device_id: deviceId,
              updated_at: adjustedTs,
              attribute: key,
              value: calculatedValue, // Lưu secondPart dưới dạng chuỗi
            },
          };

          try {
            const result = await databaseFunctions.insert(add);
            if (result.success) {
              console.log('Data saved successfully');
            } else {
              console.log('Failed to save data to the database:', result.error);
            }
          } catch (error) {
            console.error('Database query error:', error);
          }
        }
        else {
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

          calculatedValue = itemValue < 400 ? 0 : (((itemValue - MinR) * ((Maxo - Mino) / (MaxR - MinR))) + Mino).toFixed(2);
          const add = {
            tableName: 'device_attribute',
            data: {
              device_id: deviceId,
              updated_at: adjustedTs,
              attribute: key,
              value: calculatedValue, // Lưu secondPart dưới dạng chuỗi
            },
          };

          try {
            const result = await databaseFunctions.insert(add);
            if (result.success) {
              console.log('Data saved successfully');
            } else {
              console.log('Failed to save data to the database:', result.error);
            }
          } catch (error) {
            console.error('Database query error:', error);
          }
        }
      }
      else if (isNaN(itemValue) && deviceId == 'Device004') {

        const add = {
          tableName: 'device_attribute',
          data: {
            device_id: deviceId,
            updated_at: adjustedTs,
            attribute: key,
            status: itemValue, // Lưu secondPart dưới dạng chuỗi
          },
        };

        try {
          const result = await databaseFunctions.insert(add);
          if (result.success) {
            console.log('Data saved successfully');
          } else {
            console.log('Failed to save data to the database:', result.error);
          }
        } catch (error) {
          console.error('Database query error:', error);
        }
      } else if (!isNaN(itemValue) && deviceId == 'Device005') {
        if (key == 'Bat') {
          let battery = null;
          if (itemValue > 100) {
            battery = 100;
          } else {
            battery = itemValue;
          }
          const add = {
            tableName: 'device_attribute',
            data: {
              device_id: deviceId,
              updated_at: adjustedTs,
              attribute: key,
              value: battery, // Lưu secondPart dưới dạng chuỗi
            },
          };

          try {
            const result = await databaseFunctions.insert(add);
            if (result.success) {
              console.log('Data saved successfully');
            } else {
              console.log('Failed to save data to the database:', result.error);
            }
          } catch (error) {
            console.error('Database query error:', error);
          }
        }
        else if (key == 'PI_1' || key == 'PI_2') {
          const aValue = await databaseFunctions.select({ tableName: 'system_config', fields: 'value', condition: "attribute='MinR'" });
          if (!aValue.success === 0) {
            return res.json({ success: false, message: 'Không thể lấy giá trị "MinR hoặc MaxR hoặc Mino hoặc Maxo" từ cơ sở dữ liệu', code: 'FAILED_RETRIEVE_A' });
          }
          const a = parseFloat(aValue.data[0].value);
          if (isNaN(a)) {
            return res.json({ success: false, message: 'Giá trị "MinR" hoặc "MaxR" hoặc "Mino" hoặc "Maxo" từ cơ sở dữ liệu không hợp lệ', code: 'INVALID_A' });
          }
          calculatedValue = (itemValue / a).toFixed(2);
          const add = {
            tableName: 'device_attribute',
            data: {
              device_id: deviceId,
              updated_at: adjustedTs,
              attribute: key,
              value: calculatedValue, // Lưu secondPart dưới dạng chuỗi
            },
          };

          try {
            const result = await databaseFunctions.insert(add);
            if (result.success) {
              console.log('Data saved successfully');
            } else {
              console.log('Failed to save data to the database:', result.error);
            }
          } catch (error) {
            console.error('Database query error:', error);
          }
        }
        else {
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

          calculatedValue = itemValue < 400 ? 0 : (((itemValue - MinR) * ((Maxo - Mino) / (MaxR - MinR))) + Mino).toFixed(2);
          const add = {
            tableName: 'device_attribute',
            data: {
              device_id: deviceId,
              updated_at: adjustedTs,
              attribute: key,
              value: calculatedValue, // Lưu secondPart dưới dạng chuỗi
            },
          };

          try {
            const result = await databaseFunctions.insert(add);
            if (result.success) {
              console.log('Data saved successfully');
            } else {
              console.log('Failed to save data to the database:', result.error);
            }
          } catch (error) {
            console.error('Database query error:', error);
          }
        }
      }
      else if (isNaN(itemValue) && deviceId == 'Device005') {

        const add = {
          tableName: 'device_attribute',
          data: {
            device_id: deviceId,
            updated_at: adjustedTs,
            attribute: key,
            status: itemValue, // Lưu secondPart dưới dạng chuỗi
          },
        };

        try {
          const result = await databaseFunctions.insert(add);
          if (result.success) {
            console.log('Data saved successfully');
          } else {
            console.log('Failed to save data to the database:', result.error);
          }
        } catch (error) {
          console.error('Database query error:', error);
        }
      }
      if (deviceId == 'Device002') {
        // console.log(deviceId);
        // const id_device='Device002'
        const add = {
          tableName: 'device_attribute',
          data: {
            device_id: deviceId,
            updated_at: adjustedTs,
            attribute: key,
            value: itemValue, // Lưu secondPart dưới dạng chuỗi
          },
        };

        try {
          const result = await databaseFunctions.insert(add);
          if (result.success) {
            console.log('Data saved successfully');
          } else {
            console.log('Failed to save data to the database:', result.error);
          }
        } catch (error) {
          console.error('Database query error:', error);
        }

      }

    }
  } catch (error) {
    console.error('Error parsing JSON:', error);
  }
});

// Xử lý sự kiện khi kết nối bị đóng
mqttClient.on('close', () => {
  console.log('Connection to MQTT broker closed');
});

// Xử lý sự kiện khi có lỗi
mqttClient.on('error', (error) => {
  console.error('MQTT error:', error);
});

module.exports = mqttClient;

