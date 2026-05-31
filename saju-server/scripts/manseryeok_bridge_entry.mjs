if (typeof globalThis.atob === "undefined") {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

  globalThis.atob = function atobPolyfill(input) {
    let source = String(input).replace(/=+$/, "");
    let output = "";

    if (source.length % 4 === 1) {
      throw new Error("Invalid base64");
    }

    for (let bitCount = 0, bitStorage = 0, buffer, index = 0; (buffer = source.charAt(index++)); ) {
      buffer = chars.indexOf(buffer);

      if (buffer >= 0) {
        bitStorage = bitCount % 4 ? bitStorage * 64 + buffer : buffer;

        if (bitCount++ % 4) {
          output += String.fromCharCode(255 & (bitStorage >> ((-2 * bitCount) & 6)));
        }
      }
    }

    return output;
  };
}

import {
  calculateSaju,
  getSolarTermForDate,
  getSolarTermsByYear,
  lunarToSolar,
  solarToLunar,
} from "@fullstackfamily/manseryeok";

function parseJson(json) {
  return JSON.parse(json);
}

function toJson(value) {
  return JSON.stringify(value);
}

globalThis.ManseryeokBridge = {
  solarToLunarFromJson(json) {
    const payload = parseJson(json);
    return toJson(solarToLunar(payload.year, payload.month, payload.day));
  },
  lunarToSolarFromJson(json) {
    const payload = parseJson(json);
    return toJson(lunarToSolar(payload.year, payload.month, payload.day, !!payload.is_leap_month));
  },
  calculateSajuFromJson(json) {
    const payload = parseJson(json);
    return toJson(
      calculateSaju(payload.year, payload.month, payload.day, payload.hour, payload.minute ?? 0, {
        longitude: payload.longitude,
        applyTimeCorrection: payload.apply_time_correction !== false,
      }),
    );
  },
  getSolarTermForDateFromJson(json) {
    const payload = parseJson(json);
    return toJson(getSolarTermForDate(payload.year, payload.month, payload.day));
  },
  getSolarTermsByYearFromJson(json) {
    const payload = parseJson(json);
    return toJson(getSolarTermsByYear(payload.year));
  },
};

