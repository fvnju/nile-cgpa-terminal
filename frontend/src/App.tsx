import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { fetchCGPA } from "./utils/api";

const asciiArt = `
███    ██ ██ ██      ███████       ██████  ██████    ██████   █████ 
████   ██ ██ ██      ██           ██      ██       ██   ██ ██   ██
██ ██  ██ ██ ██      █████   █████ ██      ██   ███  ██████  ███████
██  ██ ██ ██ ██      ██           ██      ██    ██  ██     ██   ██
██   ████ ██ ███████  ███████       ██████  ██████    ██     ██   ██
`;

interface TerminalLine {
  id: number;
  text: string;
  isCommand?: boolean;
}

function App() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: 1, text: "Welcome to NILE CGPA Terminal v1.0", isCommand: false },
    { id: 2, text: "Type 'help' for available commands", isCommand: false },
    { id: 3, text: "Type 'cgpa' to check your cgpa", isCommand: false },
  ]);
  const [currentInput, setCurrentInput] = useState("");
  const [isFocused, setIsFocused] = useState(true);
  const [envVars, setEnvVars] = useState<Record<string, string>>({
    USER: "user@nile-cgpa",
    HOME: "/home/user",
    PATH: "/usr/local/bin:/usr/bin:/bin",
    SHELL: "/bin/bash",
  });
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tuiMode, setTuiMode] = useState<"none" | "studentId" | "password">(
    "none"
  );
  const [tuiData, setTuiData] = useState({ studentId: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const commands = {
    help: "Available commands: help, clear, about, ascii, date, whoami, env, export, echo, history, cgpa",
    clear: "",
    about: "NILE CGPA - A modern terminal interface to check your CGPA",
    ascii: asciiArt,
    date: new Date().toLocaleString(),
    whoami: envVars.USER || "user@nile-cgpa",
    env: Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n"),
    history: commandHistory
      .map((cmd, index) => `${index + 1}  ${cmd}`)
      .join("\n"),
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const expandVariables = (text: string): string => {
    return text.replace(/\$([A-Z_][A-Z0-9_]*)/g, (_, varName) => {
      return envVars[varName] || "";
    });
  };

  const handleCGPACommand = async (args: string[]) => {
    const newLines = [...lines];

    // Check for -e flag (use environment variables)
    if (args.includes("-e")) {
      const studentId = envVars.STUDENT_ID;
      const password = envVars.PASSWORD;

      if (!studentId || !password) {
        newLines.push({
          id: Date.now() + 1,
          text: "Error: STUDENT_ID and PASSWORD environment variables must be set when using -e flag",
          isCommand: false,
        });
        newLines.push({
          id: Date.now() + 2,
          text: "Set them with: export STUDENT_ID=your_student_id && export PASSWORD=yourpassword",
          isCommand: false,
        });
        setLines(newLines);
        return;
      }

      // Call API with environment variables
      setIsLoading(true);
      newLines.push({
        id: Date.now() + 1,
        text: "Fetching CGPA using environment credentials...",
        isCommand: false,
      });
      setLines(newLines);

      try {
        const result = await fetchCGPA({ studentId, password });
        const updatedLines = [...newLines];

        if (result.success) {
          for (const iter of result.data!) {
            for (const x in iter) {
              updatedLines.push({
                id: Date.now() + 2,
                // @ts-expect-error fix later
                text: `${x}: ${iter[x]}`,
                isCommand: false, // TODO: check
              });
            }
            updatedLines.push({
              id: Date.now() + 2,
              text: "   ",
              isCommand: false,
            });
          }
        } else {
          updatedLines.push({
            id: Date.now() + 2,
            text: `Error: ${result.error}`,
            isCommand: false,
          });
        }
        setLines(updatedLines);
      } catch (error) {
        const updatedLines = [...newLines];
        updatedLines.push({
          id: Date.now() + 2,
          text: `Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          isCommand: false,
        });
        setLines(updatedLines);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Start TUI mode
      newLines.push({
        id: Date.now() + 1,
        text: "Enter your credentials to fetch CGPA:",
        isCommand: false,
      });
      setLines(newLines);
      setTuiMode("studentId");
      setTuiData({ studentId: "", password: "" });
    }
  };

  const exitTuiMode = () => {
    const newLines = [...lines];
    newLines.push({
      id: Date.now(),
      text: "^C",
      isCommand: false,
    });
    setLines(newLines);
    setTuiMode("none");
    setTuiData({ studentId: "", password: "" });
    setIsLoading(false);
  };

  const handleTuiInput = async (input: string) => {
    const newLines = [...lines];

    if (tuiMode === "studentId") {
      setTuiData((prev) => ({ ...prev, studentId: input }));
      newLines.push({
        id: Date.now(),
        text: `Student ID: ${input}`,
        isCommand: false,
      });
      setLines(newLines);
      setTuiMode("password");
    } else if (tuiMode === "password") {
      // Check if password is empty
      if (!input.trim()) {
        newLines.push({
          id: Date.now(),
          text: "Password: ",
          isCommand: false,
        });
        newLines.push({
          id: Date.now() + 1,
          text: "Error: Password cannot be empty. Please try again.",
          isCommand: false,
        });
        setLines(newLines);
        // Stay in password mode for retry
        return;
      }

      setTuiData((prev) => ({ ...prev, password: input }));
      newLines.push({
        id: Date.now(),
        text: `Password: ${"*".repeat(input.length)}`,
        isCommand: false,
      });
      newLines.push({
        id: Date.now() + 1,
        text: "Fetching CGPA...",
        isCommand: false,
      });
      setLines(newLines);
      setTuiMode("none");
      setIsLoading(true);

      try {
        const result = await fetchCGPA({
          studentId: tuiData.studentId,
          password: input,
        });
        const updatedLines = [...newLines];

        if (result.success) {
          for (const iter of result.data!) {
            for (const x in iter) {
              updatedLines.push({
                id: Date.now() + 2,
                // @ts-expect-error fix later
                text: `${x}: ${iter[x]}`,
                isCommand: false, // TODO: check later
              });
            }
            updatedLines.push({
              id: Date.now() + 2,
              text: "   ",
              isCommand: false,
            });
          }
        } else {
          updatedLines.push({
            id: Date.now() + 2,
            text: `Error: ${result.error}`,
            isCommand: false,
          });
        }
        setLines(updatedLines);
      } catch (error) {
        const updatedLines = [...newLines];
        updatedLines.push({
          id: Date.now() + 2,
          text: `Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          isCommand: false,
        });
        setLines(updatedLines);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCommand = (command: string) => {
    const originalCommand = command;
    const trimmedCommand = command.trim();
    const newLines = [...lines];

    // Add the command line
    newLines.push({
      id: Date.now(),
      text: `$ ${originalCommand}`,
      isCommand: true,
    });

    // Add to history if not empty and not duplicate of last command
    if (
      trimmedCommand &&
      trimmedCommand !== commandHistory[commandHistory.length - 1]
    ) {
      setCommandHistory((prev) => [...prev, trimmedCommand]);
    }

    // Reset history index
    setHistoryIndex(-1);

    if (trimmedCommand === "clear") {
      setLines([]);
      return;
    }

    // Handle export command (set environment variables)
    if (trimmedCommand.startsWith("export ")) {
      const exportArgs = trimmedCommand.substring(7).trim();
      const eqIndex = exportArgs.indexOf("=");

      if (eqIndex > 0) {
        const varName = exportArgs.substring(0, eqIndex).trim();
        const varValue = exportArgs
          .substring(eqIndex + 1)
          .trim()
          .replace(/^["']|["']$/g, "");

        setEnvVars((prev) => ({
          ...prev,
          [varName]: expandVariables(varValue),
        }));

        newLines.push({
          id: Date.now() + 1,
          text: `${varName}=${varValue}`,
          isCommand: false,
        });
      } else {
        newLines.push({
          id: Date.now() + 1,
          text: "Usage: export VARIABLE=value",
          isCommand: false,
        });
      }
      setLines(newLines);
      return;
    }

    // Handle echo command with variable expansion
    if (trimmedCommand.startsWith("echo ")) {
      const echoArgs = trimmedCommand.substring(5);
      const expandedText = expandVariables(echoArgs);

      newLines.push({
        id: Date.now() + 1,
        text: expandedText,
        isCommand: false,
      });
      setLines(newLines);
      return;
    }

    // Handle variable assignment (VAR=value)
    const assignmentMatch = trimmedCommand.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (assignmentMatch) {
      const [, varName, varValue] = assignmentMatch;
      const cleanValue = varValue.replace(/^["']|["']$/g, "");

      setEnvVars((prev) => ({
        ...prev,
        [varName]: expandVariables(cleanValue),
      }));

      setLines(newLines);
      return;
    }

    // Handle CGPA command
    if (trimmedCommand.startsWith("cgpa")) {
      const args = trimmedCommand.split(/\s+/).slice(1);
      handleCGPACommand(args);
      return;
    }

    const cmd = trimmedCommand.toLowerCase();

    // Handle built-in commands
    if (commands[cmd as keyof typeof commands]) {
      const response = commands[cmd as keyof typeof commands];
      if (response) {
        newLines.push({
          id: Date.now() + 1,
          text: response,
          isCommand: false,
        });
      }
    } else if (trimmedCommand) {
      newLines.push({
        id: Date.now() + 1,
        text: `Command not found: ${trimmedCommand}. Type 'help' for available commands.`,
        isCommand: false,
      });
    }

    setLines(newLines);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Ctrl+C to exit TUI mode
    if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      if (tuiMode !== "none") {
        exitTuiMode();
        setCurrentInput("");
        return;
      }
    }

    if (e.key === "Enter") {
      if (tuiMode !== "none") {
        handleTuiInput(currentInput);
      } else {
        handleCommand(currentInput);
      }
      setCurrentInput("");
      setHistoryIndex(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex =
          historyIndex === -1
            ? commandHistory.length - 1
            : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentInput("");
        } else {
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[newIndex]);
        }
      }
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div
      className="min-h-screen bg-black text-green-400 font-mono text-sm p-4"
      onClick={focusInput}
    >
      <div className="max-w-4xl mx-auto">
        {/* Terminal Header */}
        <div className="bg-gray-800 rounded-t-lg px-4 py-2 flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="ml-4 text-gray-300 text-xs">NILE CGPA Terminal</span>
        </div>

        {/* Terminal Body */}
        <div
          className="bg-black rounded-b-lg p-4 min-h-96 border border-gray-800"
          onClick={focusInput}
        >
          {/* Previous lines */}
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`mb-1 ${
                line.isCommand ? "text-blue-400" : "text-green-400"
              }`}
            >
              <pre className="whitespace-pre-wrap">{line.text}</pre>
            </motion.div>
          ))}

          {/* Current input line */}
          <div className="flex items-center w-full">
            <span className="text-blue-400 mr-2">
              {tuiMode === "studentId"
                ? "Student ID:"
                : tuiMode === "password"
                ? "Password:"
                : "$"}
            </span>
            <div className="flex items-center flex-1">
              <input
                ref={inputRef}
                type={tuiMode === "password" ? "password" : "text"}
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className="bg-transparent outline-none text-green-400 caret-transparent"
                style={{ width: `${Math.max(1, currentInput.length)}ch` }}
                autoFocus
                disabled={isLoading}
              />
              {/* Animated cursor - only show when focused and not loading */}
              {isFocused && !isLoading && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="text-green-400"
                >
                  █
                </motion.span>
              )}
              {/* Loading indicator */}
              {isLoading && (
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="text-yellow-400 ml-2"
                >
                  Loading...
                </motion.span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
