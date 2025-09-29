(function () {
  Blockly.defineBlocksWithJsonArray([
    {
      type: "pin_digital_write",
      message0: "数字输出 引脚 %1 电平 %2",
      args0: [
        {
          type: "field_number",
          name: "PIN",
          value: 2,
          min: 0,
          max: 39,
        },
        {
          type: "field_dropdown",
          name: "LEVEL",
          options: [
            ["HIGH", "HIGH"],
            ["LOW", "LOW"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: "设置指定数字引脚的输出电平",
    },
    {
      type: "pin_digital_read",
      message0: "读取数字引脚 %1",
      args0: [
        {
          type: "field_number",
          name: "PIN",
          value: 2,
          min: 0,
          max: 39,
        },
      ],
      output: "Number",
      colour: 160,
      tooltip: "读取数字引脚电平",
    },
    {
      type: "pin_analog_read",
      message0: "读取模拟引脚 %1",
      args0: [
        {
          type: "field_number",
          name: "PIN",
          value: 36,
          min: 0,
          max: 39,
        },
      ],
      output: "Number",
      colour: 160,
      tooltip: "读取模拟引脚的值",
    },
    {
      type: "delay_ms",
      message0: "等待 %1 毫秒",
      args0: [
        {
          type: "field_number",
          name: "MS",
          value: 1000,
          min: 0,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 65,
    },
    {
      type: "wifi_setup",
      message0: "连接 WiFi SSID %1 密码 %2",
      args0: [
        {
          type: "field_input",
          name: "SSID",
          text: "MyWiFi",
        },
        {
          type: "field_input",
          name: "PASSWORD",
          text: "password",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: "连接指定的 WiFi 网络",
    },
    {
      type: "wifi_http_get",
      message0: "HTTP GET 请求 %1 保存到 %2",
      args0: [
        {
          type: "field_input",
          name: "URL",
          text: "http://example.com",
        },
        {
          type: "field_input",
          name: "VAR",
          text: "response",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 210,
      tooltip: "发送简单的 HTTP GET 请求",
    },
    {
      type: "bluetooth_serial_begin",
      message0: "蓝牙串口初始化 名称 %1",
      args0: [
        {
          type: "field_input",
          name: "NAME",
          text: "ESP32_BT",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 300,
    },
    {
      type: "bluetooth_serial_print",
      message0: "蓝牙串口发送 %1",
      args0: [
        {
          type: "input_value",
          name: "TEXT",
          check: "String",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 300,
    },
  ]);
})();
