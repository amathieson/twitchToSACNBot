const tmi = require('tmi.js');
var e131 = require('e131');

var cliente131 = new e131.Client(0x03);  // or use a universe
var packet = cliente131.createPacket(512);  // we want 8 RGB (x3) slots
var slotsData = packet.getSlotsData();
packet.setSourceName('test E1.31 client');
packet.setUniverse(0x03);  // make universe number consistent with the client
packet.setOption(packet.Options.PREVIEW, true);  // don't really change any fixture
packet.setPriority(packet.DEFAULT_PRIORITY);  // not strictly needed, done automatically

// Define configuration options
const opts = {
    identity: {
        username: 'CJTwitchBot',
    password: ''
},
channels: [
'techstormadam'
]
};
// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();
var isRainbow = false;
// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
    if (self) { return; } // Ignore messages from the bot

    // Remove whitespace from chat message
    var commandName = msg.trim();
    if (commandName.indexOf("!") === 0) {
        commandName = commandName.substr(1);
        // If the command is known, let's execute it
        if (commandName.toUpperCase() == "RAINBOW") {
            isRainbow = true;
            client.say(target, `Set the lights to rainbow`);
            console.log(`* Executed ${commandName} command`);
            rainbow();
        } else if (getRgbish(commandName) !== NaN) {
            // const num = rollDice();
            isRainbow = false;
            var colorVals = RGBvalues.color(getRgbish(commandName));
            setColorRGBWAUV(colorVals.r, colorVals.g, colorVals.b, 0, 0, 0);
            client.say(target, `Set the lights to the color`);
            console.log(`* Executed ${commandName} command`);
        } else {
            console.log(`* Unknown command ${commandName}`);
        }
    }
}
// Function called when the "dice" command is issued
function rollDice () {
    const sides = 6;
    return Math.floor(Math.random() * sides) + 1;
}
// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
}

function getRgbish(c){
    var i= 0, itm,
        M= c.replace(/ +/g, '').match(/(rgba?)|(\d+(\.\d+)?%?)|(\.\d+)/g);
    if(M && M.length> 3){
        while(i<3){
            itm= M[++i];
            if(itm.indexOf('%')!= -1){
                itm= Math.round(parseFloat(itm)*2.55);
            }
            else itm= parseInt(itm);
            if(itm<0 || itm> 255) return NaN;
            M[i]= itm;
        }
        if(c.indexOf('rgba')=== 0){
            if(M[4]==undefined ||M[4]<0 || M[4]> 1) return NaN;
        }
        else if(M[4]) return NaN;
        return M[0]+'('+M.slice(1).join(',')+')';
    }
    return NaN;
}
function setColorRGBWAUV(r, g, b, w, a, uv) {
    var addr = 422;
    for (var i = 0; i < 2; i++){
        addr = addr-1;
        slotsData[addr] = 255;
        slotsData[addr + 1] = r;
        slotsData[addr + 2] = g;
        slotsData[addr + 3] = b;
        slotsData[addr + 4] = w;
        slotsData[addr + 5] = a;
        slotsData[addr + 6] = uv;
        slotsData[addr + 7] = 0;
        slotsData[addr + 8] = 0;
        addr = 431;
    }
    cliente131.send(packet);
}
var lastCol = 0;
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rainbow() {
    var addr = 422;
    for (var i = 0; i < 2; i++){
        addr = addr-1;
        slotsData[addr] = 255;
        slotsData[addr + 1] = hslToRgb(lastCol, 1, 0.5)[0];
        slotsData[addr + 2] = hslToRgb(lastCol, 1, 0.5)[1];
        slotsData[addr + 3] = hslToRgb(lastCol, 1, 0.5)[2];
        slotsData[addr + 4] = 0;
        slotsData[addr + 5] = 0;
        slotsData[addr + 6] = 0;
        slotsData[addr + 7] = 0;
        slotsData[addr + 8] = 0;
        addr = 431;
    }
    lastCol = lastCol+0.0001;
    if (lastCol > 1) {
        lastCol = 0;
    }
    if (isRainbow) {
        cliente131.send(packet, function () {
            rainbow();
        });
    }
}

var RGBvalues = (function() {

    var _hex2dec = function(v) {
        return parseInt(v, 16)
    };

    var _splitHEX = function(hex) {
        var c;
        if (hex.length === 4) {
            c = (hex.replace('#','')).split('');
            return {
                r: _hex2dec((c[0] + c[0])),
                g: _hex2dec((c[1] + c[1])),
                b: _hex2dec((c[2] + c[2]))
            };
        } else {
            return {
                r: _hex2dec(hex.slice(1,3)),
                g: _hex2dec(hex.slice(3,5)),
                b: _hex2dec(hex.slice(5))
            };
        }
    };

    var _splitRGB = function(rgb) {
        var c = (rgb.slice(rgb.indexOf('(')+1, rgb.indexOf(')'))).split(',');
        var flag = false, obj;
        c = c.map(function(n,i) {
            return (i !== 3) ? parseInt(n, 10) : flag = true, parseFloat(n);
        });
        obj = {
            r: c[0],
            g: c[1],
            b: c[2]
        };
        if (flag) obj.a = c[3];
        return obj;
    };

    var color = function(col) {
        var slc = col.slice(0,1);
        if (slc === '#') {
            return _splitHEX(col);
        } else if (slc.toLowerCase() === 'r') {
            return _splitRGB(col);
        } else {
            console.log('!Ooops! RGBvalues.color('+col+') : HEX, RGB, or RGBa strings only');
        }
    };

    return {
        color: color
    };
}());
