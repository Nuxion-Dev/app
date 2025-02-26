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

function start() {
    const version = getVersion();
    const notes = prompt('Enter the release notes: ');

    data.version = version;
    data.notes = notes;
    data.pub_date = new Date().toISOString();

    if (!fs.existsSync('./.tauri/nuxion.key')) {
        console.log('The .tauri/nuxion.key file was not found. Please generate the key first.');
        return;
    }

    const signature = fs.readFileSync('./.tauri/nuxion.key', 'utf8');
    
    //data.platforms['linux-x86_64'].signature = signature;
    //data.platforms['linux-x86_64'].url = ``;

    data.platforms['windows-x86_64'].signature = signature;
    data.platforms['windows-x86_64'].url = `https://github.com/Nuxion-Dev/app/releases/download/v${version}/Nuxion_${version}_x64-setup.exe`;

    //data.platforms['darwin-x86_64'].signature = signature;
    //data.platforms['darwin-x86_64'].url = ``

    fs.writeFileSync("latest.json", JSON.stringify(data, null, 4));
    console.log('latest.json file generated!');
    console.log('Please upload the generated file to the release assets on GitHub.');
}

function getVersion() {
    const version = prompt('Enter the version: ');
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
        console.log('Invalid version format. Please use x.y.z');
        return getVersion();
    }

    return version;
}

start();