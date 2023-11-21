const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const app = express();
const cors = require('cors');
router.use(cors());
app.use(bodyParser.json());
const { authentication } = require('../src/middlewares');
const device = require('../src/modules/device');
router.post('/updateconfig', authentication, async (req, res) => {
  try {
    await device.updateConfigsystem(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.get('/getconfig', authentication, async (req, res) => {
  try {
    await device.getconfig(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.get('/getConfig/:deviceId', authentication, async (req, res) => {
  try {
    await device.getConfig(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
/* Data from device. */
router.post('/:deviceId', authentication, async (req, res) => {
  try {
    await device.receiveData(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});

router.get('/getAllDeviceId', authentication, async (req, res) => {
  try {
    await device.getAllDeviceId(req, res);
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});

router.get('/:deviceId', authentication, async (req, res) => {
  try {
    await device.returnData(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});

router.get('/getdevicedata/:deviceId', authentication, async (req, res) => {
  try {
    await device.getData(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});

router.post('/updatedata/:deviceId', authentication, async (req, res) => {
  try {
    await device.updateDeviceData(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});

router.post('/updateprofile/:deviceId', authentication, async (req, res) => {
  try {
    await device.updateProfile(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});

router.get('/getprofile/:deviceId', authentication, async (req, res) => {
  try {
    await device.getDeviceProfile(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});


router.get('/getdevicebattery/:deviceId', authentication, async (req, res) => {
  try {
    await device.getDeviceBattery(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});


router.get('/getdeviceconfig/:deviceId', authentication, async (req, res) => {
  try {
    await device.getDeviceConfig(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});

router.post('/updatedevicebattery/:deviceId', authentication, async (req, res) => {
  try {
    await device.updateDeviceBattery(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.post('/updatedeviceconfig/:deviceId', authentication, async (req, res) => {
  try {
    await device.updateDeviceConfig(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.get('/getdataall/:deviceId', authentication, async (req, res) => {
  try {
    await device.getalll(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.post('/mqtt/mqttsend', authentication, async (req, res) => {
  try {
    await device.mqttcontrol(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.get('/getstatus/:deviceId', authentication, async (req, res) => {
  try {
    await device.getStatus(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});

router.post('/mqtt/mqttcontrol/:deviceId', authentication, async (req, res) => {
  try {
    await device.mqttControlIot(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.post('/mqtt/mqttcontrol003', authentication, async (req, res) => {
  try {
    await device.mqttControlIot003(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.post('/mqtt/mqttcontrol004', authentication, async (req, res) => {
  try {
    await device.mqttControlIot004(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.post('/mqtt/mqttcontrol005', authentication, async (req, res) => {
  try {
    await device.mqttControlIot005(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});

router.post('/sendstatus/:deviceId', authentication, async (req, res) => {
  try {
    await device.send(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.post('/settime/updateOrCreateSchedule', authentication, async (req, res) => {
  try {
    await device.updateOrCreateSchedule(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.get('/settime/getScheduleData', authentication, async (req, res) => {
  try {
    await device.getScheduleData(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.delete('/settime/deleteScheduleData', authentication, async (req, res) => {
  try {
    await device.deleteTime(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.get('/setthreshold/getthreshold', authentication, async (req, res) => {
  try {
    await device.getThreshold(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.post('/setthreshold/insertthreshold', authentication, async (req, res) => {
  try {
    await device.insertThreshold(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.post('/setthreshold/updatethreshold', authentication, async (req, res) => {
  try {
    await device.updateThreshold(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
router.get('/getDevice/getAllDeviceLocation', authentication, async (req, res) => {
  try {
    await device.getAllDeviceLocation(req, res); // Truyá»n chÃ­nh xÃ¡c Ä‘á»‘i tÆ°á»£ng req vÃ  res vÃ o hÃ m receiveData
  } catch (e) {
    console.error(e);
    res.send({
      code: e.code || 'UNEXPECTED_ERROR',
      message: e.message || "Unexpected error"
    });
  }
});
module.exports = router;
