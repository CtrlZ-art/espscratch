(function () {
  const Arduino = new Blockly.Generator("Arduino");
  Arduino.ORDER_ATOMIC = 0;
  Arduino.ORDER_NONE = 99;

  Arduino.init = function (workspace) {
    Arduino.definitions_ = Object.create(null);
    Arduino.setups_ = [];
  };

  Arduino.finish = function (code) {
    const includeLines = Object.values(Arduino.definitions_);
    const includes = includeLines.length ? includeLines.join("\n") + "\n\n" : "";
    const setupLines = Arduino.setups_.length ? Arduino.setups_.join("\n") + "\n" : "";
    const trimmedCode = code.trim();
    const loopBody = trimmedCode
      ? `  ${trimmedCode.replace(/\n/g, "\n  ")}`
      : "  // loop body";
    return `${includes}void setup() {\n${setupLines}}\n\nvoid loop() {\n${loopBody}\n}\n`;
  };

  Arduino.scrub_ = function (block, code) {
    return code + "\n";
  };

  Arduino.addInclude = function (identifier, code) {
    if (!Arduino.definitions_[identifier]) {
      Arduino.definitions_[identifier] = code;
    }
  };

  Arduino.addSetup = function (code) {
    if (!Arduino.setups_.includes(`  ${code}`)) {
      Arduino.setups_.push(`  ${code}`);
    }
  };

  Arduino["controls_if"] = Blockly.JavaScript["controls_if"];
  Arduino["logic_compare"] = Blockly.JavaScript["logic_compare"];
  Arduino["logic_operation"] = Blockly.JavaScript["logic_operation"];
  Arduino["logic_boolean"] = Blockly.JavaScript["logic_boolean"];
  Arduino["math_number"] = Blockly.JavaScript["math_number"];
  Arduino["text"] = Blockly.JavaScript["text"];
  Arduino["text_join"] = Blockly.JavaScript["text_join"];

  Arduino["pin_digital_write"] = function (block) {
    const pin = block.getFieldValue("PIN");
    const level = block.getFieldValue("LEVEL");
    Arduino.addSetup(`pinMode(${pin}, OUTPUT);`);
    return `digitalWrite(${pin}, ${level});\n`;
  };

  Arduino["pin_digital_read"] = function (block) {
    const pin = block.getFieldValue("PIN");
    Arduino.addSetup(`pinMode(${pin}, INPUT);`);
    return [`digitalRead(${pin})`, Arduino.ORDER_ATOMIC];
  };

  Arduino["pin_analog_read"] = function (block) {
    const pin = block.getFieldValue("PIN");
    return [`analogRead(${pin})`, Arduino.ORDER_ATOMIC];
  };

  Arduino["delay_ms"] = function (block) {
    const ms = block.getFieldValue("MS");
    return `delay(${ms});\n`;
  };

  Arduino["wifi_setup"] = function (block) {
    const ssid = block.getFieldValue("SSID");
    const password = block.getFieldValue("PASSWORD");
    Arduino.addInclude("wifi_include", "#include <WiFi.h>");
    Arduino.addSetup("Serial.begin(115200);");
    Arduino.addSetup(`WiFi.begin(\"${ssid}\", \"${password}\");`);
    Arduino.addSetup("while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print('.'); }");
    Arduino.addSetup("Serial.println(\"\nWiFi connected\");");
    return "";
  };

  Arduino["wifi_http_get"] = function (block) {
    const url = block.getFieldValue("URL");
    const variable = block.getFieldValue("VAR");
    Arduino.addInclude("wifi_include", "#include <WiFi.h>");
    Arduino.addInclude("http_include", "#include <HTTPClient.h>");
    Arduino.addSetup("Serial.begin(115200);");
    return `{
  HTTPClient http;
  http.begin(\"${url}\");
  int httpCode = http.GET();
  if (httpCode > 0) {
    String ${variable} = http.getString();
    Serial.println(${variable});
  }
  http.end();
}\n`;
  };

  Arduino["bluetooth_serial_begin"] = function (block) {
    const name = block.getFieldValue("NAME");
    Arduino.addInclude("bt_include", "#include <BluetoothSerial.h>");
    Arduino.addSetup("BluetoothSerial SerialBT;");
    Arduino.addSetup(`SerialBT.begin(\"${name}\");`);
    return "";
  };

  Arduino["bluetooth_serial_print"] = function (block) {
    Arduino.addInclude("bt_include", "#include <BluetoothSerial.h>");
    Arduino.addSetup("BluetoothSerial SerialBT;");
    const text = Arduino.valueToCode(
      block,
      "TEXT",
      Arduino.ORDER_ATOMIC
    ) || '""';
    return `SerialBT.println(${text});\n`;
  };

  window.Blockly.Arduino = Arduino;
})();
