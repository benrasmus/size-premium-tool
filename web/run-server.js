// Wrapper so the Next.js CLI never receives a cross-drive "directory" argument
// (the preview harness spawns this from a different drive, and Next's internal
// manifest-path joining breaks when given an absolute directory arg in that case).
// Chdir first, then invoke the CLI with no directory arg so it just uses cwd.
process.chdir(__dirname);
process.argv = [process.argv[0], process.argv[1], process.env.NEXT_MODE || "start", "-p", process.env.PORT || "3000"];
require("./node_modules/next/dist/bin/next");
