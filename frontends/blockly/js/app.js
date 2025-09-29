(async function () {
  const blocklyArea = document.getElementById("blocklyArea");
  const blocklyDiv = document.getElementById("blocklyDiv");
  const consoleEl = document.querySelector(".console");
  const cameraPanel = document.querySelector(".camera-panel");
  const cameraFrame = document.getElementById("cameraFrame");
  const boardList = document.querySelector(".board-list");

  const resizeBlockly = () => {
    const areaRect = blocklyArea.getBoundingClientRect();
    blocklyDiv.style.left = `${areaRect.left}px`;
    blocklyDiv.style.top = `${areaRect.top}px`;
    blocklyDiv.style.width = `${areaRect.width}px`;
    blocklyDiv.style.height = `${areaRect.height}px`;
    Blockly.svgResize(workspace);
  };

  const toolbox = {
    kind: "categoryToolbox",
    contents: [
      {
        kind: "category",
        name: "基础",
        colour: "20",
        contents: [
          { kind: "block", type: "pin_digital_write" },
          { kind: "block", type: "delay_ms" },
        ],
      },
      {
        kind: "category",
        name: "输入",
        colour: "160",
        contents: [
          { kind: "block", type: "pin_digital_read" },
          { kind: "block", type: "pin_analog_read" },
        ],
      },
      {
        kind: "category",
        name: "WiFi",
        colour: "210",
        contents: [
          { kind: "block", type: "wifi_setup" },
          { kind: "block", type: "wifi_http_get" },
        ],
      },
      {
        kind: "category",
        name: "蓝牙",
        colour: "300",
        contents: [
          { kind: "block", type: "bluetooth_serial_begin" },
          { kind: "block", type: "bluetooth_serial_print" },
        ],
      },
      {
        kind: "sep",
      },
      {
        kind: "category",
        name: "逻辑",
        colour: "210",
        contents: [
          { kind: "block", type: "controls_if" },
          { kind: "block", type: "logic_compare" },
          { kind: "block", type: "logic_operation" },
          { kind: "block", type: "logic_boolean" },
        ],
      },
      {
        kind: "category",
        name: "文本",
        colour: "160",
        contents: [
          { kind: "block", type: "text" },
          { kind: "block", type: "text_join" },
        ],
      },
    ],
  };

  const workspace = Blockly.inject(blocklyDiv, {
    toolbox,
    grid: {
      spacing: 20,
      length: 3,
      colour: "#ddd",
      snap: true,
    },
    trashcan: true,
  });

  window.addEventListener("resize", resizeBlockly, false);
  resizeBlockly();

  const defaultXml = `<xml xmlns="https://developers.google.com/blockly/xml">
    <block type="pin_digital_write" x="40" y="40">
      <field name="PIN">2</field>
      <field name="LEVEL">HIGH</field>
      <next>
        <block type="delay_ms">
          <field name="MS">500</field>
          <next>
            <block type="pin_digital_write">
              <field name="PIN">2</field>
              <field name="LEVEL">LOW</field>
              <next>
                <block type="delay_ms">
                  <field name="MS">500</field>
                </block>
              </next>
            </block>
          </next>
        </block>
      </next>
    </block>
  </xml>`;
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(defaultXml), workspace);

  const setStatus = (status, message) => {
    const div = document.createElement("div");
    div.textContent = message;
    div.classList.add(`status-${status}`);
    consoleEl.appendChild(div);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  };

  let currentBoard = null;
  let currentJobStream = null;

  const renderBoards = (boards) => {
    boardList.innerHTML = "";
    boards.forEach((board, index) => {
      const item = document.createElement("div");
      item.className = "board-item";
      if (index === 0) {
        item.classList.add("active");
        currentBoard = board;
      }
      item.innerHTML = `<strong>${board.name}</strong><small>${board.identifier}</small>`;
      item.addEventListener("click", () => {
        document
          .querySelectorAll(".board-item")
          .forEach((el) => el.classList.remove("active"));
        item.classList.add("active");
        currentBoard = board;
      });
      boardList.appendChild(item);
    });
  };

  const fetchBoards = async () => {
    try {
      const response = await fetch("/api/boards");
      if (!response.ok) throw new Error("无法获取板卡列表");
      const data = await response.json();
      if (!Array.isArray(data) || !data.length) {
        setStatus("error", "没有可用的开发板");
        return;
      }
      renderBoards(data);
    } catch (error) {
      setStatus("error", error.message);
    }
  };

  await fetchBoards();

  const workspaceToCode = () => {
    Blockly.Arduino.init(workspace);
    const code = Blockly.Arduino.workspaceToCode(workspace);
    return Blockly.Arduino.finish(code);
  };

  const startStream = (jobId, board) => {
    if (currentJobStream) {
      currentJobStream.close();
    }
    const source = new EventSource(`/api/stream/${jobId}`);
    currentJobStream = source;
    source.onmessage = (event) => {
      setStatus("running", event.data);
    };
    source.addEventListener("board", (event) => {
      setStatus("running", `正在使用开发板: ${event.data}`);
    });
    source.addEventListener("status", (event) => {
      setStatus("running", `状态更新: ${event.data}`);
      if (event.data === "success") {
        setStatus("success", "烧录完成，打开摄像头");
        if (board && board.cameraUrl) {
          cameraFrame.src = board.cameraUrl;
          cameraPanel.classList.add("active");
        }
        source.close();
      }
      if (event.data === "error") {
        setStatus("error", "烧录失败，请检查日志");
        source.close();
      }
    });
    source.onerror = () => {
      source.close();
    };
  };

  document.getElementById("btn-generate").addEventListener("click", () => {
    const code = workspaceToCode();
    setStatus("running", "生成代码完成");
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "esp32_sketch.ino";
    link.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("btn-flash").addEventListener("click", async () => {
    if (!currentBoard) {
      setStatus("error", "请选择开发板");
      return;
    }
    cameraPanel.classList.remove("active");
    cameraFrame.src = "";
    const code = workspaceToCode();
    setStatus("running", "开始编译并烧录...");
    try {
      const response = await fetch("/api/flash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          board_id: currentBoard.identifier,
          project_name: "blockly_project",
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "烧录失败");
      }
      const data = await response.json();
      setStatus("running", `已提交任务 ${data.job_id}`);
      startStream(data.job_id, currentBoard);
    } catch (error) {
      setStatus("error", error.message);
    }
  });

  document.getElementById("btn-save").addEventListener("click", async () => {
    const identifier = prompt("请输入项目ID", `project-${Date.now()}`);
    if (!identifier) return;
    const name = prompt("项目名称", identifier) || identifier;
    const description = prompt("项目描述", "");
    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
    const code = workspaceToCode();
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          name,
          description,
          blocks_xml: xml,
          code,
        }),
      });
      if (!response.ok) {
        throw new Error("保存失败");
      }
      setStatus("success", "项目保存成功");
    } catch (error) {
      setStatus("error", error.message);
    }
  });

  document.getElementById("btn-load").addEventListener("click", async () => {
    const identifier = prompt("输入要载入的项目ID");
    if (!identifier) return;
    try {
      const response = await fetch(`/api/projects/${identifier}`);
      if (!response.ok) {
        throw new Error("项目不存在");
      }
      const data = await response.json();
      const xml = Blockly.Xml.textToDom(data.blocks_xml);
      workspace.clear();
      Blockly.Xml.domToWorkspace(xml, workspace);
      setStatus("success", "项目载入完成");
    } catch (error) {
      setStatus("error", error.message);
    }
  });
})();
