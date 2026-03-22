const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");

// .env を読み込み
require("dotenv").config();

const IGNORE = [
  "node_modules",
  ".git",
  ".env",
  ".env.example",
  "deploy.js",
  "package.json",
  "package-lock.json",
  "CLAUDE.md",
  ".gitignore",
  ".claude",
];

async function uploadDir(client, localDir, remoteDir) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE.includes(entry.name)) continue;

    const localPath = path.join(localDir, entry.name);
    const remotePath = remoteDir + "/" + entry.name;

    if (entry.isDirectory()) {
      await client.ensureDir(remotePath);
      await uploadDir(client, localPath, remotePath);
      await client.cd(remoteDir);
    } else {
      console.log(`  uploading: ${remotePath}`);
      await client.uploadFrom(localPath, remotePath);
    }
  }
}

async function deploy() {
  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    const host = process.env.FTP_HOST;
    const user = process.env.FTP_USER;
    const password = process.env.FTP_PASS;
    const remoteDir = process.env.FTP_REMOTE_DIR || "/";

    if (!host || !user || !password) {
      console.error("Error: .env に FTP_HOST, FTP_USER, FTP_PASS を設定してください");
      console.error("  .env.example を参考に .env ファイルを作成してください");
      process.exit(1);
    }

    console.log(`Connecting to ${host}...`);
    await client.access({
      host,
      user,
      password,
      secure: true,
      secureOptions: { rejectUnauthorized: false },
    });

    console.log(`Connected! Uploading to ${remoteDir}...`);
    await client.ensureDir(remoteDir);
    await uploadDir(client, __dirname, remoteDir);

    console.log("Deploy complete!");
  } catch (err) {
    console.error("Deploy failed:", err.message);

    // FTPS implicit が失敗した場合、explicit で再試行
    if (err.message.includes("connect") || err.code === "ETIMEDOUT") {
      console.log("Retrying with explicit FTPS...");
      try {
        await client.access({
          host: process.env.FTP_HOST,
          user: process.env.FTP_USER,
          password: process.env.FTP_PASS,
          secure: true,
          secureOptions: { rejectUnauthorized: false },
        });
        const remoteDir = process.env.FTP_REMOTE_DIR || "/";
        await client.ensureDir(remoteDir);
        await uploadDir(client, __dirname, remoteDir);
        console.log("Deploy complete! (explicit FTPS)");
      } catch (err2) {
        console.error("Retry also failed:", err2.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  } finally {
    client.close();
  }
}

deploy();
