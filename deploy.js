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
      secure: "implicit",
      port: 990,
      secureOptions: { rejectUnauthorized: false },
    });

    console.log(`Connected! Uploading to ${remoteDir}...`);
    await client.ensureDir(remoteDir);
    await uploadDir(client, __dirname, remoteDir);

    console.log("Deploy complete!");
  } catch (err) {
    console.error("Deploy failed (implicit FTPS):", err.message);
    console.log("Retrying with explicit FTPS on port 21...");
    try {
      const client2 = new ftp.Client();
      client2.ftp.verbose = false;
      await client2.access({
        host: process.env.FTP_HOST,
        user: process.env.FTP_USER,
        password: process.env.FTP_PASS,
        secure: true,
        secureOptions: { rejectUnauthorized: false },
      });
      const remoteDir = process.env.FTP_REMOTE_DIR || "/";
      await client2.ensureDir(remoteDir);
      await uploadDir(client2, __dirname, remoteDir);
      console.log("Deploy complete! (explicit FTPS)");
      client2.close();
    } catch (err2) {
      console.error("Retry also failed:", err2.message);
      console.log("Retrying with plain FTP (no encryption)...");
      try {
        const client3 = new ftp.Client();
        client3.ftp.verbose = false;
        await client3.access({
          host: process.env.FTP_HOST,
          user: process.env.FTP_USER,
          password: process.env.FTP_PASS,
          secure: false,
        });
        const remoteDir = process.env.FTP_REMOTE_DIR || "/";
        await client3.ensureDir(remoteDir);
        await uploadDir(client3, __dirname, remoteDir);
        console.log("Deploy complete! (plain FTP)");
        client3.close();
      } catch (err3) {
        console.error("All attempts failed:", err3.message);
        process.exit(1);
      }
    }
  } finally {
    client.close();
  }
}

deploy();
