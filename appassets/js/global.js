/*
    This file contains all global client-side 
    JavaScript functions and actions for the app.
*/

// get IPC renderer module for communication with main process, and get remote
// module for direct usage of main process functions within render process,
// and get dialog for using dialogs.
const { ipcRenderer, remote } = require('electron');
const { dialog } = remote;

// get fs module from remote module to read and write from filesystem
const fs = remote.require("fs");

// create functions that utilize fs module for ease of use

// read file
const readFile = (filename) => {
    // read file using Node.js fs module
    return fs.readFileSync(filename, "UTF-8", (err, data) => {
        // log error if error exists
        if(err) console.error(err);

        // return read file data
        return data;
    });
};

// write file
const writeFile = (filename, filedata) => {
    // write file using Node.js fs module
    fs.writeFile(filename, filedata, "UTF-8", (err) => {
        // log error if error exists
        if(err) console.error(err);
    });
};

// get crypto module from remote module for generating random cipher IV
const crypto = remote.require("crypto");

// get aes-js module from remote module for encryption
const aesjs = remote.require("aes-js");

// get pbkdf2 module from remote module for key derivation
const pbkdf2 = remote.require("pbkdf2");

// create encrypt and decrypt functions using modules for ease of use

// encrypt text with AES-256 (CBC) using key derived from password argument
const encryptText = (password, text) => {
    // convert text to base64
    const textInBase64 = btoa(text);
    
    // add padding to text in base64 so that it is a multiple of 16 bytes long
    let textWithPadding = textInBase64;

    // if text isn't a multiple of 16 bytes, add necessary amount of "=" chars to make it so
    if(textWithPadding.length % 16 != 0) {
        textWithPadding += "=".repeat(16 - (textWithPadding.length % 16));
    }

    // convert padded text to bytes and store in variable
    const textInBytes = aesjs.utils.utf8.toBytes(textWithPadding);

    // variable for key generated from password using KDF
    const derivedKey = pbkdf2.pbkdf2Sync(password, 'salt', 1, 256 / 8, 'sha512');

    // generate random IV and store in variable
    const generatedIV = crypto.randomBytes(16);

    // AES-CBC object
    const aesCBC = new aesjs.ModeOfOperation.cbc(derivedKey, generatedIV);

    // encrypted text (in bytes) using AES-CBC, and store encrypted bytes in variable
    const encryptedTextInBytes = aesCBC.encrypt(textInBytes);

    // convert encryptedTextInBytes to Hex to print/store (and put in variable)
    const encryptedTextInHex = aesjs.utils.hex.fromBytes(encryptedTextInBytes);

    // convret generated IV to Hex and store in variable
    const generatedIVInHex = aesjs.utils.hex.fromBytes(generatedIV);

    // create cipher text string with IV and encrypted hex, separated by a ":" (which is a non-hex string)
    const cipherText = generatedIVInHex + ":" + encryptedTextInHex;

    // return cipher text, which includes IV, and encrypted text
    return cipherText;
};

// decrypt cipher text with AES-256 (CBC) using key derived from password argument
const decryptText = (password, cipherText) => {
    // variable for key generated from password using KDF
    const derivedKey = pbkdf2.pbkdf2Sync(password, 'salt', 1, 256 / 8, 'sha512');
    
    // split cipherText into IV and encrypted text (separated by a colon) and store in variable
    const splitCipherText = cipherText.split(":");

    // store parts of splitCipherText variable into corresponding separate variables
    const ivInHex = splitCipherText[0];
    const encryptedHex = splitCipherText[1];

    // convert IV and encrypted Hex to bytes and store in variable
    const iv = aesjs.utils.hex.toBytes(ivInHex);
    const encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex);

    // AES-CBC object
    const aesCBC = new aesjs.ModeOfOperation.cbc(derivedKey, iv);

    // decrypt encrypted bytes and store in variable
    const decryptedBytes = aesCBC.decrypt(encryptedBytes);

    // convert decrypted bytes into decrypted text in base64
    let decryptedTextInBase64 = aesjs.utils.utf8.fromBytes(decryptedBytes);

    // remove padding from base64 decrypted text and store in variable
    decryptedTextInBase64 = decryptedTextInBase64.replace(/=/g, "");

    // convert decryptedTextInBase64 to text
    const decryptedText = atob(decryptedTextInBase64);

    // return decrypted text
    return decryptedText;
};

// functions to encrypt and decrypt JSON objects

// encrypt JSON
const encryptJSON = (password, obj) => encryptText(password, JSON.stringify(obj));

// decrypt JSON
const decryptJSON = (password, cipherText) => JSON.parse(decryptText(password, cipherText));

// functions to get decrypted JSON from file, and to encrypt and write JSON to file

// encrypt
const encryptJSONToFile = (filename, password, obj) => {
    // variable for encrypted text
    const encryptedText = encryptJSON(password, obj);

    // write encrypted text to filename
    writeFile(filename, encryptedText);
}

// decrypt
const decryptJSONInFile = (filename, password) => {
    // get encrypted text from file and store in variable
    const encryptedText = readFile(filename);
    
    // variable for decrypted JSON
    const decryptedJSON = decryptJSON(password, encryptedText);

    // return decryptedJSON
    return decryptedJSON;
}

// display app container once window is fully loaded
window.addEventListener("load", (event) => {
    document.querySelector("body > div.container").removeAttribute("style");
});