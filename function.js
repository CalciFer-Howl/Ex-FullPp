const fs = require('fs');
const pino = require("pino");
const Jimp = require('jimp');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers, 
    S_WHATSAPP_NET,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

const logger = pino({ level: "fatal" });

function removeFile(FilePath) {
    if (fs.existsSync(FilePath)) {
        fs.rmSync(FilePath, { recursive: true, force: true });
    }
};

async function generateProfilePicture(buffer) {
    const jimp = await Jimp.read(buffer);
    const min = Math.min(jimp.getWidth(), jimp.getHeight());
    const cropped = jimp.clone().crop(0, 0, min, min); // Square crop
    return {
        img: await cropped.scaleToFit(324, 720).getBufferAsync(Jimp.MIME_JPEG),
        preview: await cropped.normalize().getBufferAsync(Jimp.MIME_JPEG),
    };
}

function makeid(num = 4) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < num; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

async function getPaire(num, img) {
    const id = makeid();
    const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
    try {
        const { version } = await fetchLatestBaileysVersion();

        const session = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger.child({ level: "fatal" })),
            },
            printQRInTerminal: false,
            logger,
            browser: await Browsers.windows('Firefox'),
        });

        async function updateProfile(imag) {	
            const { img } = await generateProfilePicture(imag);

            await session.query({
                tag: 'iq',
                attrs: {
                    to: S_WHATSAPP_NET,
                    type: 'set',
                    xmlns: 'w:profile:picture'
                },
                content: [
                    {
                        tag: 'picture',
                        attrs: { type: 'image' },
                        content: img
                    }
                ]
            });
        }

        if (!session.authState.creds.registered) {
            await delay(1500);
            num = num.replace(/[^0-9]/g, '');
            const code = await session.requestPairingCode(num);
            return { code };
        }

        session.ev.on('creds.update', saveCreds);

        session.ev.on("connection.update", async (s) => {
            const { connection, lastDisconnect } = s;

            if (connection === "open") {
                await delay(1000 * 10);
                await updateProfile(img);
                await session.sendMessage(session.user.id, { text: '*Profile updated [ 🍓 ]*' });
                await session.ws.close();
                await removeFile('./temp/' + id);
                process.exit(0);
            } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                await delay(10000);
                await getPaire(num, img); // Pass the arguments
            }
        });
    } catch (err) {
        logger.error("Service restarted due to error:", err);
        await removeFile('./temp/' + id);
        return { code: "Service Unavailable" };
    }
}

module.exports = { getPaire };
