'use babel';

import { CompositeDisposable } from 'atom';

export default {
  subscriptions: null,

  activate(state) {
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-hdl:analyze-component': () => this.AnalyzeComponent(),
      'atom-hdl:paste-instance': () => this.pasteInstance(),
      'atom-hdl:analyze-entity': () => this.AnalyzeEntity(),
      'atom-hdl:paste-constraints': () => this.pasteConstraints(),
      'atom-hdl:paste-signal-decleration': () => this.pasteSignals(),
      'atom-hdl:create-vhdl-file': () => this.createVHDLFile(),
      'atom-hdl:update-header': () => this.updateHeader(),
      'atom-hdl:typecast': () => this.typecast(),
      'atom-hdl:init': () => this.initVhdlTemplate(),
      'atom-hdl:auto-align' : () => this.autoAlign(),
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },


  replaceTemplateVariables(templateText) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const pcName = 'Your PC Name'; // Your computer's name
    const entityName = 'Your Entity Name'; // Your VHDL entity name
    const fileName = 'Your File Name'; // Your VHDL file name

    return templateText
      .replace(/\$year/g, year)
      .replace(/\$pc_name/g, pcName)
      .replace(/\$entity_name/g, entityName)
      .replace(/\$file_name/g, fileName);
  },

  updateHeader() {
    const editor = atom.workspace.getActiveTextEditor();
    const fs = require('fs');
    const path = require('path');
    const os = require('os');


    if (editor) {
      const editorText = editor.getText();
      const entityRegex = /entity\s+(\w+)\s+is[\s\S]*?end\s+entity/gmi;
      const entityMatch = entityRegex.exec(editorText);
      const headerRegex = /-- =+\s*-- \(C\) COPYRIGHT[\s\S]*?-- Designer[\s\S]*?-- =+\s*\n/;
      const templateText = fs.readFileSync(path.join(atom.packages.resolvePackagePath('atom-hdl'), 'vhdl-template.vhd'), 'utf8')
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const pcName = os.hostname(); // Your computer's name
      let entityName = "entityName"
      if(entityMatch){
          entityName = entityMatch[1]; // Your VHDL entity name
      }
      let filePath = editor.getPath();
      const fileName = path.basename(filePath); // Your VHDL file name
      const newHeader = templateText.replace(/\$year/g, year).replace(/\$pc_name/g, pcName).replace(/\$entity_name/g, entityName).replace(/\$file_name/g, fileName);

      console.log(headerRegex.test(editorText));
      console.log(headerRegex.exec(editorText));
      if (headerRegex.test(editorText)) {
        // Update the existing header
        const updatedText = editorText.replace(headerRegex, newHeader+'\n');
        editor.setText(updatedText);
        atom.notifications.addSuccess('Header updated in the current editor.');
      } else {
        // Add the header at the beginning of the file
        editor.setText(newHeader + '\n' + editorText);
        atom.notifications.addSuccess('Header added to the current editor.');
      }
    } else {
      atom.notifications.addWarning('No active editor found.');
    }
  },

  initVhdlTemplate() {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const editor = atom.workspace.getActiveTextEditor();

    if (editor) {

      const enarchText = fs.readFileSync(path.join(atom.packages.resolvePackagePath('atom-hdl'), 'vhdl-enarch.vhd'), 'utf8')
      const templateText = fs.readFileSync(path.join(atom.packages.resolvePackagePath('atom-hdl'), 'vhdl-template.vhd'), 'utf8')

      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const pcName = os.hostname(); // Your computer's name
      let filePath = editor.getPath();
      const fileName = path.basename(filePath);


      const newHeader = templateText.replace(/\$year/g, year).replace(/\$pc_name/g, pcName).replace(/\$entity_name/g, fileName.replace(/\.vhd/g, "")).replace(/\$file_name/g, fileName);
      editor.setText(newHeader + '\n' + enarchText.replace(/\$entity_name/g, fileName.replace(/\.vhd/g, "")) + '\n');
    }
  },

  typecast() {
      const editor = atom.workspace.getActiveTextEditor();
      if (editor) {
          const selectedText = editor.getSelectedText();
          const editorText = editor.getText();

          // Regular expressions for signals, ports and variables
          var signalRegex = /signal\s+(\w+)\s+:\s+(\w+)/g;
          var constantRegex = /constant\s+(\w+)\s+:\s+(\w+)/g;
          // var portRegex =  /port\s*\(([^)]+)\)/g;
          var portRegex = /port\s*\(((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*)\)\;/g;
          var genericRegex = /generic\s*\(((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*)\)\;/g;

          var portLineRegex = /(\w+)\s+:\s+(\w+)\s+([\w\s\(\)0-9\-]+)/g;
          var genericLineRegex = /(\w+)\s+:\s+([\w\s\(\)0-9\-]+)/g;


          var variableRegex = /variable\s+(\w+)\s+:\s+(\w+)/g;

          // Extract signals
          var signals = [...editorText.matchAll(signalRegex)].map(match => {
              return {name: match[1], type: match[2]};
          });

          var constants = [...editorText.matchAll(constantRegex)].map(match => {
              return {name: match[1], type: match[2]};
          });

          // Extract ports
          // var ports = [...editorText.matchAll(portRegex)].flatMap(match => {
          //     return match[1].split(';').map(portLine => {
          //         var portMatch = /(\w+)\s+:\s+(\w+)\s+(\w+)/.exec(portLine);
          //         return portMatch ? {name: portMatch[1], direction: portMatch[2], type: portMatch[3]} : null;
          //     }).filter(Boolean);
          // });
          // Extract ports
          var ports = [...editorText.matchAll(portRegex)].flatMap(match => {
              return [...match[1].matchAll(portLineRegex)].map(portMatch => {
                  return {name: portMatch[1], direction: portMatch[2], type: portMatch[3].trim()};
              });
          });

          // Extract generics
          var generics = [...editorText.matchAll(genericRegex)].flatMap(match => {
              return [...match[1].matchAll(genericLineRegex)].map(genericMatch => {
                  return {name: genericMatch[1], type: genericMatch[2].trim()};
              });
          });


          // Extract variables
          var variables = [...editorText.matchAll(variableRegex)].map(match => {
              return {name: match[1], type: match[2]};
          });

          console.log({signals, constants, ports, generics, variables});

          var assignmentMatch = /(\w+)\s*<=\s*(\w+)/.exec(selectedText);
          if (assignmentMatch) {
              var leftVar = assignmentMatch[1];
              var rightVar = assignmentMatch[2];

              // Search for the variable names in signals, ports and variables
              var leftType = null;
              var rightType = null;

              [signals, constants, ports, generics, variables].forEach(list => {
                list.forEach(item => {
                  if (item.name === leftVar) {
                    leftType = item.type;
                  }
                  if (item.name === rightVar) {
                    rightType = item.type;
                  }
                });
              });

              if (!leftType || !rightType) {
                  return null;
              }

              console.log({leftType, rightType});

              // Handle casting from std_logic_vector (treated as unsigned) to integer
              if (leftType === 'integer' && rightType.includes('std_logic_vector')) {
                  const selectedRange = editor.getSelectedBufferRange();
                  editor.setTextInBufferRange(selectedRange, '');
                  editor.insertText(`${leftVar} <= to_integer(unsigned(${rightVar}));`);
              }

              // Handle casting from integer to std_logic_vector (treated as unsigned)
              if (leftType.includes('std_logic_vector') && rightType === 'integer') {
                  const selectedRange = editor.getSelectedBufferRange();
                  editor.setTextInBufferRange(selectedRange, '');
                  editor.insertText(`${leftVar} <= std_logic_vector(to_unsigned(${rightVar}, ${leftVar}'length));`);
              }

              // Handle casting from signed/unsigned to std_logic_vector
              if (leftType.includes('std_logic_vector') && (rightType === 'signed' || rightType === 'unsigned')) {
                  const selectedRange = editor.getSelectedBufferRange();
                  editor.setTextInBufferRange(selectedRange, '');
                  editor.insertText(`${leftVar} <= std_logic_vector(${rightVar});`);
              }
          }
      }
  },

  autoAlign() {
      const editor = atom.workspace.getActiveTextEditor();
      if (editor) {
          const selectedText = editor.getSelectedText();
          // const editorText = editor.getText();

          const lines = selectedText.trim().split('\n');
          let maxLength = 0;

          const prefixSpace = (lines[1] && lines[1].match(/^\s+/)) ? lines[1].match(/^\s+/)[0] : "";
          const trimmedLines = lines.map(line => line.trimStart());

          for (const line of trimmedLines) {
              let index = line.indexOf("=>");
              if (index == -1) {
                  index = line.indexOf("<=");
              }
              if (index == -1) {
                  index = line.indexOf(":");
              }
              if (index > maxLength) {
                  maxLength = index;
              }
          }

          const alignedLines = trimmedLines.map(line => {
              let index = line.indexOf("=>");
              if (index == -1) {
                  index = line.indexOf("<=");
              }
              if (index == -1) {
                  index = line.indexOf(":");
              }

              if (index != -1 && index < maxLength) {
                  return line.slice(0, index).padEnd(maxLength) + line.slice(index);
              }
              return line;
          });
          const finalLines = alignedLines.map(line => prefixSpace + line);
          editor.insertText(`${finalLines .join('\n')}`);
      }
  },


  AnalyzeComponent() {
      const editor = atom.workspace.getActiveTextEditor();

      if (editor) {
        const editorText = editor.getSelectedText();
        const componentRegex = /component\s+(\w+)\s+is[\s\S]*?end\s+component/gmi;
        const componentMatch = componentRegex.exec(editorText);

        if (componentMatch) {
          let clockIndex = 0;
          let clockPorts = [];
          const componentName = componentMatch[1];
          const portRegex = /(\w+)\s+:\s+(in|out)\s+(\w+)\s*(?:\((\d+)\s+(?:downto|to)\s+(\d+)\))?/gmi;
          let portMatch;
          this.instanceTextToPaste = `u_${componentName} : ${componentName} port map (\n`;
          this.signalDeclarations = '';
          this.constraintText = '';

          while ((portMatch = portRegex.exec(componentMatch[0])) !== null) {
            const portName = portMatch[1];
            const portType = portMatch[2];
            const portDataType = portMatch[3];
            const rangeStart = portMatch[4];
            const rangeEnd = portMatch[5];

            let signalName;

            if(portType.toLowerCase() === 'out'){
                // if (portName.startsWith('i_')) {
                  // signalName = 's_' + portName.substring(2);
                if (portName.startsWith('o_')) {
                  signalName = 's_' + componentName + '_' +portName.substring(2);
                } else {
                  signalName = 's_' + componentName + '_' + portName;
                }

                if (rangeStart && rangeEnd) {
                  this.signalDeclarations += `signal ${signalName}: ${portDataType}(${rangeStart} ${rangeStart < rangeEnd ? 'to' : 'downto'} ${rangeEnd});\n`;
                } else {
                  this.signalDeclarations += `signal ${signalName}: ${portDataType};\n`;
                }
            }


            if(portType.toLowerCase() === 'out'){
                this.instanceTextToPaste += `  ${portName} => ${signalName},\n`;
            } else{
                this.instanceTextToPaste += `  ${portName} => ,\n`;
            }

            // Check if the port name contains 'clk' or 'clock'
            if (portType.toLowerCase() === 'in' && portDataType.toLowerCase() === 'std_logic' && (portName.toLowerCase().includes('clk') || portName.toLowerCase().includes('clock'))) {
              const frequencyRegex = /(\d+)(?:MHz|KHz|Hz)?/i;
              const frequencyMatch = frequencyRegex.exec(portName);

              if (frequencyMatch) {
                let frequency = parseFloat(frequencyMatch[1]);
                const frequencyUnit = frequencyMatch[2];

                // Convert frequency to MHz if unit is missing or not MHz
                if (!frequencyUnit || frequencyUnit.toLowerCase() !== 'mhz') {
                  if (frequencyUnit && frequencyUnit.toLowerCase() === 'khz') {
                    frequency /= 1000;
                  } else if (frequencyUnit && frequencyUnit.toLowerCase() === 'hz') {
                    frequency /= 1000000;
                  }
                }

                const period = 1000 / frequency; // Calculate period in nanoseconds
                clockPorts.push(portName);
                this.constraintText += `set_property -dict { PACKAGE_PIN ${portName} IOSTANDARD LVCMOS33 } [get_ports { ${portName} }]; # ${portName}\n`;
                this.constraintText += `create_clock -period ${period} -name clk${clockIndex} [get_ports ${portName}];\n\n`;
                clockIndex++;
              }
            }
          }

          this.instanceTextToPaste = this.instanceTextToPaste.slice(0, -2); // Remove the last comma
          this.instanceTextToPaste += `\n);`;

          // atom.notifications.addSuccess("Instance text and signal declarations are generated from the current component. Use 'Paste Instance' command to paste the instance and 'signalDeclarations' variable for signal declarations.");

          if(this.instanceTextToPaste !== '') {
              atom.notifications.addSuccess("Instance is generated from the current component. Use 'Paste Instance' command to paste it.");
          }

          if(this.signalDeclarations !== '') {
              atom.notifications.addSuccess("Signal declerations are generated from the current component. Use 'Paste Signals' command to paste it.");
          }

          if(this.constraintText !== '') {
              atom.notifications.addSuccess("Constraints are generated from the current component. Use 'Paste Constraints' command to paste it.");
          }

        } else {
          atom.notifications.addWarning("No VHDL component found in the selected text.");
        }
      }
  },

  AnalyzeEntity() {
      const editor = atom.workspace.getActiveTextEditor();

      if (editor) {
        const editorText = editor.getText();
        const entityRegex = /entity\s+(\w+)\s+is[\s\S]*?end\s+entity/gmi;
        const entityMatch = entityRegex.exec(editorText);

        if (entityMatch) {
          let clockIndex = 0;
          let clockPorts = [];
          const entityName = entityMatch[1];
          const portRegex = /(\w+)\s+:\s+(in|out)\s+(\w+)\s*(?:\((\d+)\s+(?:downto|to)\s+(\d+)\))?/gmi;
          let portMatch;
          this.instanceTextToPaste = `u_${entityName} : ${entityName} port map (\n`;
          this.signalDeclarations = '';
          this.constraintText = '';

          while ((portMatch = portRegex.exec(entityMatch[0])) !== null) {
            const portName = portMatch[1];
            const portType = portMatch[2];
            const portDataType = portMatch[3];
            const rangeStart = portMatch[4];
            const rangeEnd = portMatch[5];

            let signalName;

            if(portType.toLowerCase() === 'out'){
                // if (portName.startsWith('i_')) {
                  // signalName = 's_' + portName.substring(2);
                if (portName.startsWith('o_')) {
                  signalName = 's_' + entityName + '_' +portName.substring(2);
                } else {
                  signalName = 's_' + entityName + '_' + portName;
                }

                if (rangeStart && rangeEnd) {
                  this.signalDeclarations += `signal ${signalName}: ${portDataType}(${rangeStart} ${rangeStart < rangeEnd ? 'to' : 'downto'} ${rangeEnd});\n`;
                } else {
                  this.signalDeclarations += `signal ${signalName}: ${portDataType};\n`;
                }
            }


            if(portType.toLowerCase() === 'out'){
                this.instanceTextToPaste += `  ${portName} => ${signalName},\n`;
            } else{
                this.instanceTextToPaste += `  ${portName} => ,\n`;
            }

            // Check if the port name contains 'clk' or 'clock'
            if (portType.toLowerCase() === 'in' && portDataType.toLowerCase() === 'std_logic' && (portName.toLowerCase().includes('clk') || portName.toLowerCase().includes('clock'))) {
              const frequencyRegex = /(\d+)(?:MHz|KHz|Hz)?/i;
              const frequencyMatch = frequencyRegex.exec(portName);

              if (frequencyMatch) {
                let frequency = parseFloat(frequencyMatch[1]);
                const frequencyUnit = frequencyMatch[2];

                // Convert frequency to MHz if unit is missing or not MHz
                if (!frequencyUnit || frequencyUnit.toLowerCase() !== 'mhz') {
                  if (frequencyUnit && frequencyUnit.toLowerCase() === 'khz') {
                    frequency /= 1000;
                  } else if (frequencyUnit && frequencyUnit.toLowerCase() === 'hz') {
                    frequency /= 1000000;
                  }
                }

                const period = 1000 / frequency; // Calculate period in nanoseconds
                clockPorts.push(portName);
                this.constraintText += `set_property -dict { PACKAGE_PIN ${portName} IOSTANDARD LVCMOS33 } [get_ports { ${portName} }]; # ${portName}\n`;
                this.constraintText += `create_clock -period ${period} -name clk_group_${clockIndex} [get_ports ${portName}];\n\n`;
                clockIndex++;
              } else{
                const period = 1.8;
                clockPorts.push(portName);
                this.constraintText += `set_property -dict { PACKAGE_PIN ${portName} IOSTANDARD LVCMOS33 } [get_ports { ${portName} }]; # ${portName}\n`;
                this.constraintText += `create_clock -period ${period} -name clk_group${clockIndex} [get_ports ${portName}];\n\n`;
                clockIndex++;
              }
            }
          }

          this.instanceTextToPaste = this.instanceTextToPaste.slice(0, -2); // Remove the last comma
          this.instanceTextToPaste += `\n);`;

          // atom.notifications.addSuccess("Instance text and signal declarations are generated from the current entity. Use 'Paste Instance' command to paste the instance and 'signalDeclarations' variable for signal declarations.");

          if(this.instanceTextToPaste !== '') {
              atom.notifications.addSuccess("Instance is generated from the current entity. Use 'Paste Instance' command to paste it.");
          }

          if(this.signalDeclarations !== '') {
              atom.notifications.addSuccess("Signal declerations are generated from the current entity. Use 'Paste Signals' command to paste it.");
          }

          if(this.constraintText !== '') {
              atom.notifications.addSuccess("Constraints are generated from the current entity. Use 'Paste Constraints' command to paste it.");
          }

        } else {
          atom.notifications.addWarning("No VHDL entity found in the current editor.");
        }
      }
  },

  pasteInstance() {
    const editor = atom.workspace.getActiveTextEditor();

    if (editor && this.instanceTextToPaste !== '') {
      editor.insertText(this.instanceTextToPaste);
    } else {
      atom.notifications.addWarning("No instance text available in memory.");
    }
  },

  pasteSignals() {
    const editor = atom.workspace.getActiveTextEditor();

    if (editor && this.signalDeclarations !== '') {
      editor.insertText(this.signalDeclarations);
    } else {
      atom.notifications.addWarning("No signal decleration available in memory.");
    }
  },

  pasteConstraints() {
    const editor = atom.workspace.getActiveTextEditor();

    if (editor && this.constraintText !== '') {
      editor.insertText(this.constraintText);
    } else {
      atom.notifications.addWarning("No constraint available in memory.");
    }
  }
};
