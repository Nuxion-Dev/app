const data = {
    "version": "",
    "notes": "",
    "pub_date": "",
    "platforms": {
        /*"linux-x86_64": {
            "signature": "",
            "url": ""
        },*/
        "windows-x86_64": {
            "signature": "",
            "url": ""
        },
        /*"darwin-x86_64": {
            "signature": "",
            "url": ""
        }*/
    }
}

const prompt = require('prompt-sync')();
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const inquirer = require('inquirer').createPromptModule();

async function start() {
    if (!fs.existsSync("version.txt")) {
        console.error('Version file not found.');
        const { confirm } = await inquirer({
            type: 'confirm',
            name: 'confirm',
            message: 'Do you want to run the versioning script?',
            default: false
        });
        if (confirm) {
            const v = require('./version');
            await v.start();
        }
    }

    const version = fs.readFileSync("version.txt", "utf-8").split("\n")[1].trim();
    const notes = prompt('Enter the release notes: ');

    data.version = version.split("-")[0];
    data.notes = notes;
    data.pub_date = new Date().toISOString();

    const dir = path.join(__dirname, "src-tauri/target/release/bundle/nsis");
    const installerFile = path.join(dir, 'Nuxion_' + version.split("-")[0] + '_x64-setup.exe').normalize();
    const signatureFile = installerFile + '.sig';
    if (!fs.existsSync(signatureFile)) {
        console.log('The signature file was not found. Please generate the signature first.');
        return;
    }

    const signature = fs.readFileSync(signatureFile, 'utf8');
    
    //data.platforms['linux-x86_64'].signature = signature;
    //data.platforms['linux-x86_64'].url = ``;

    data.platforms['windows-x86_64'].signature = signature;
    data.platforms['windows-x86_64'].url = `https://github.com/Nuxion-Dev/app/releases/download/${version}/Nuxion_x64-setup.exe`;

    //data.platforms['darwin-x86_64'].signature = signature;
    //data.platfo
    
    console.log('Renaming the installer file...');
    const newInstallerFile = path.join(dir, 'Nuxion_x64-setup.exe').normalize();
    if (!fs.existsSync(installerFile)) {
        if (fs.existsSync(newInstallerFile)) {
            console.log('The installer file was already renamed. Skipping...');
        } else if (!fs.existsSync(path.join(__dirname, path.basename(newInstallerFile)))) {
            console.log('The installer file was not found. Please build the installer first.');
            return;
        }
    } else {
        fs.renameSync(installerFile, newInstallerFile);
        console.log('Installer file renamed!');
    }

    fs.renameSync(newInstallerFile, path.join(__dirname, path.basename(newInstallerFile)));
    console.log('Installer file moved to the root!');
    
    console.log('Zipping the installer file...');
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(newInstallerFile + '.zip');
    await new Promise((resolve, reject) => {
        archive
            .file(newInstallerFile, { name: path.basename(newInstallerFile) })
            .on('error', err => reject(err))
            .pipe(stream);

        stream.on('close', () => {
            console.log('Installer zipped!');
            resolve();
        });
        stream.on('end', () => {
            console.log('Installer zipped!');
            resolve();
        });

        archive.finalize();
    });

    fs.writeFileSync("latest.json", JSON.stringify(data, null, 4));
    console.log('latest.json file generated!');
    console.log('Please upload the generated file to the release assets on GitHub.');
}

start();