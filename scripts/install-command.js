#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOSTS = [
  {
    label: 'Claude Code',
    dir: path.join(os.homedir(), '.claude', 'commands'),
    filename: 'aiprompting:improve.md',
  },
  {
    label: 'OpenAI Codex CLI',
    dir: path.join(os.homedir(), '.codex', 'commands'),
    filename: 'aiprompting:improve.md',
  },
  {
    label: 'Cursor',
    dir: path.join(os.homedir(), '.cursor', 'commands'),
    filename: 'aiprompting-improve.md',
  },
];

const SOURCE = path.resolve(__dirname, '..', '.claude', 'commands', 'improve.md');

function parseArgs(argv) {
  const flags = { force: false, hosts: null, dryRun: false, list: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--force' || a === '-f') flags.force = true;
    else if (a === '--dry-run' || a === '-n') flags.dryRun = true;
    else if (a === '--list') flags.list = true;
    else if (a === '--host' && argv[i + 1]) {
      flags.hosts = (flags.hosts || []).concat(argv[i + 1].toLowerCase());
      i += 1;
    } else if (a === '--help' || a === '-h') {
      printUsage();
      process.exit(0);
    }
  }
  return flags;
}

function printUsage() {
  process.stdout.write(
    'aiprompting install-command\n\n' +
    'USAGE\n' +
    '  node scripts/install-command.js [options]\n\n' +
    'OPTIONS\n' +
    '  --host <name>    Install only for the named host (claude / codex / cursor).\n' +
    '                   May be repeated. Default: install for every detected host directory.\n' +
    '  --force, -f      Overwrite an existing command file.\n' +
    '  --dry-run, -n    Print what would be done without writing.\n' +
    '  --list           List supported hosts and target paths, then exit.\n' +
    '  --help, -h       Show this help.\n'
  );
}

function matchesHostFilter(host, filter) {
  if (!filter) return true;
  const id = host.label.toLowerCase().split(' ')[0];
  return filter.includes(id);
}

function main(argv) {
  const flags = parseArgs(argv);
  if (flags.list) {
    process.stdout.write('Supported hosts:\n');
    for (const h of HOSTS) {
      process.stdout.write(`  ${h.label.padEnd(20)} → ${path.join(h.dir, h.filename)}\n`);
    }
    return 0;
  }

  if (!fs.existsSync(SOURCE)) {
    process.stderr.write(`source command file not found: ${SOURCE}\n`);
    return 2;
  }
  const body = fs.readFileSync(SOURCE, 'utf8');

  let installed = 0;
  let skipped = 0;
  for (const host of HOSTS) {
    if (!matchesHostFilter(host, flags.hosts)) continue;
    const target = path.join(host.dir, host.filename);
    const dirExists = fs.existsSync(host.dir);
    const fileExists = fs.existsSync(target);

    if (!dirExists) {
      process.stdout.write(`- ${host.label.padEnd(20)} skip (directory not present: ${host.dir})\n`);
      skipped += 1;
      continue;
    }
    if (fileExists && !flags.force) {
      process.stdout.write(`- ${host.label.padEnd(20)} skip (already installed; use --force to overwrite)\n`);
      skipped += 1;
      continue;
    }
    if (flags.dryRun) {
      process.stdout.write(`- ${host.label.padEnd(20)} dry-run → would write ${target}\n`);
      continue;
    }
    fs.writeFileSync(target, body, 'utf8');
    process.stdout.write(`✓ ${host.label.padEnd(20)} installed → ${target}\n`);
    installed += 1;
  }

  if (!flags.dryRun) {
    process.stdout.write(`\nDone. installed=${installed} skipped=${skipped}\n`);
  }
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}
