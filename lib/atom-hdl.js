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
      'atom-hdl:paste-signal-decleration': () => this.pasteSignals()
    }));
  },

  deactivate() {
      this.subscriptions.dispose();
    },

  // convertComponentToInstance() {
  //   const editor = atom.workspace.getActiveTextEditor();
  //
  //   if (editor) {
  //     const selectedText = editor.getSelectedText();
  //     const componentRegex = /component\s+(\w+)\s+is[\s\S]*?end\s+component/gmi;
  //     const componentMatch = componentRegex.exec(selectedText);
  //
  //     if (componentMatch) {
  //       const componentName = componentMatch[1];
  //       const portRegex = /(\w+)\s+:\s+(in|out)\s+(\w+)\s*(?:\((\d+)\s+(?:downto|to)\s+(\d+)\))?/gmi;
  //       let portMatch;
  //       this.instanceTextToPaste = `${componentName}_inst : ${componentName} port map (\n`;
  //
  //       while ((portMatch = portRegex.exec(componentMatch[0])) !== null) {
  //         const portName = portMatch[1];
  //         this.instanceTextToPaste += `  ${portName} => ${portName},\n`;
  //       }
  //
  //       this.instanceTextToPaste = this.instanceTextToPaste.slice(0, -2); // Remove the last comma
  //       this.instanceTextToPaste += `\n);`;
  //
  //       atom.notifications.addSuccess("Instance text is copied to memory. Use 'Paste Instance' command to paste it.");
  //     } else {
  //       atom.notifications.addWarning("No VHDL component found in the selected text.");
  //     }
  //   }
  // },

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
