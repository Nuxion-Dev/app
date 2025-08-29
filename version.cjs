const prompt = require('prompt-sync')();
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const p = inquirer.createPromptModule();

async function start() {
    const { confirm } = await p({
        type: 'confirm',
        name: 'confirm',
        message: 'You want to manually type the version?',
        default: false
    });
    
    console.log('Reading current version from version.txt');
    if (!fs.existsSync("version.txt")) {
        console.log('version.txt not found, creating with default version');
        const tauriConfig = require('./src-tauri/tauri.conf.json');
        fs.writeFileSync("version.txt", `${tauriConfig.package.version}\n${tauriConfig.package.version}`);
    }

    const [current, updaterCurrent] = fs.readFileSync('version.txt', 'utf-8').split("\n").map(v => v.trim());

    if (confirm) {
        const version = prompt('Enter the version (format: x.y.z or x.y.z-(alpha|beta|rc).n): ');
        const valid = /^\d+\.\d+\.\d+(-(alpha|beta|rc)\.\d+)?$/.test(version);
        const preRelease = version.split("-")[1] || "";

        let updaterVersion;
        if (preRelease) 
            if (current.split("-")[0] == version.split("-")[0])
                updaterVersion = updaterCurrent;
            else 
                updaterVersion = current.split("-")[0];
        else updaterVersion = version.split("-")[0];

        if (valid) saveVersion(version, updaterVersion);
        else console.error('Invalid version format.');
        return;
    }

    const { bumpType } = await p({
        type: 'list',
        name: 'bumpType',
        message: 'Select the type of version bump:',
        choices: ['none', 'patch', 'minor', 'major'],
        default: 'none'
    });
    const { preRelease } = await p({
        type: 'list',
        name: 'preRelease',
        message: 'Enter pre-release tag:',
        choices: ['stable', 'alpha', 'beta', 'rc'],
        default: 'stable'
    });

    bumpVersion(current, updaterCurrent, bumpType, preRelease);
}

function bumpVersion(current, updaterCurrent, bumpType, preRelease) {
    const [major, minor, patch] = current.split("-")[0].split('.').map((v) => parseInt(v, 10));

    let newVersion;
    switch (bumpType) {
        case 'none':
            newVersion = current.split("-")[0];
            break;
        case 'patch':
            newVersion = `${major}.${minor}.${patch + 1}`;
            break;
        case 'minor':
            newVersion = `${major}.${minor + 1}.0`;
            break;
        case 'major':
            newVersion = `${major + 1}.0.0`;
            break;
    }

    const currentPreReleaseMatch = current.match(/-(alpha|beta|rc)\.(\d+)$/g);
    const currentPreReleaseName = currentPreReleaseMatch ? currentPreReleaseMatch[0].split('.')[0].substring(1) : '';
    const preReleaseId = currentPreReleaseMatch && currentPreReleaseName == preRelease ? parseInt(currentPreReleaseMatch[0].split('.')[1]) + 1 : 0;
    if (preRelease != 'stable')
        newVersion += `-${preRelease}.${preReleaseId}`;

    saveVersion(newVersion, preRelease != 'stable' ? updaterCurrent : newVersion.split("-")[0]);
}

function saveVersion(version, updaterVersion) {
    console.log(`Saving version: ${version}, updater version: ${updaterVersion}`);
    fs.writeFileSync("version.txt", `${version}\n${updaterVersion}`);

    const pkg = require('./package.json');
    pkg.version = version;
    fs.writeFileSync("package.json", JSON.stringify(pkg, null, 4));

    const cargo = fs.readFileSync("./src-tauri/Cargo.toml", "utf-8").split("\n");
    for (let i = 0; i < cargo.length; i++) {
        if (cargo[i].startsWith("version")) {
            cargo[i] = `version = "${version}"`;
            break;
        }
    }

    fs.writeFileSync("./src-tauri/Cargo.toml", cargo.join("\n"));

    const tauri = require('./src-tauri/tauri.conf.json');
    tauri.version = updaterVersion;
    fs.writeFileSync("./src-tauri/tauri.conf.json", JSON.stringify(tauri, null, 4));

    console.log(`Updated version to ${version}, tauri updater will see version ${updaterVersion}.`);
}

start();