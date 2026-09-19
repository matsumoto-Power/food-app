const { useState, useEffect, useMemo, useRef, useCallback } = React;
if (typeof window !== "undefined" && !window.storage) {
  const PREFIX = "shokuji-app:";
  window.storage = {
    async get(key) {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw == null) throw new Error("not found");
      return { key, value: raw, shared: false };
    },
    async set(key, value) {
      localStorage.setItem(PREFIX + key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      const existed = localStorage.getItem(PREFIX + key) != null;
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: existed, shared: false };
    },
    async list(prefix) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) {
          const bare = k.slice(PREFIX.length);
          if (!prefix || bare.startsWith(prefix)) keys.push(bare);
        }
      }
      return { keys, prefix, shared: false };
    }
  };
}
const DEFAULT_FOODS = [
  { n: "\u30B6\u30D0\u30B9 \u30E8\u30FC\u30B0\u30EB\u30C8\u5473", mn: "\u98F2\u6599", sb: [], k: 96, p: 15, f: 0, c: 10, s: 0.2 },
  { n: "\u7D05\u9BAD\u304C\u3086", mn: "\u3054\u98EF", sb: ["\u9B5A\u985E"], k: 98, p: 3.8, f: 0.75, c: 19, s: 1.3 },
  { n: "\u9D8F\u304C\u3086", mn: "\u3054\u98EF", sb: [], k: 100, p: 4.8, f: 1, c: 19, s: 1.4 },
  { n: "\u3075\u3093\u308F\u308A\u7389\u5B50\u3068\u9D8F\u96D1\u708A", mn: "\u3054\u98EF", sb: ["\u9CE5\u985E"], k: 105, p: 4, f: 1.7, c: 19, s: 1.6 },
  { n: "\u30AA\u30FC\u30C8\u30DF\u30FC\u30EB\u3054\u306F\u3093", mn: "\u3054\u98EF", sb: [], k: 114, p: 3.8, f: 2.7, c: 20, s: 0 },
  { n: "\u3071\u3071\u3063\u3068\u30E9\u30A4\u30B9 100g", mn: "\u3054\u98EF", sb: [], k: 147, p: 2.3, f: 0.2, c: 34.2, s: 0.02 },
  { n: "\u7CD6\u8CEA\u30AA\u30D5\u3054\u98EF", mn: "\u3054\u98EF", sb: [], k: 161, p: 3.3, f: 0.4, c: 38.2, s: 0 },
  { n: "\u3082\u3061\u9EA6\u3054\u306F\u3093", mn: "\u3054\u98EF", sb: [], k: 222, p: 3.8, f: 0.8, c: 53.4, s: 0 },
  { n: "\u30C1\u30AD\u30F3\u30E9\u30FC\u30E1\u30F3 \u3076\u3063\u3053\u307F\u98EF", mn: "\u3054\u98EF", sb: [], k: 315, p: 7.3, f: 7.8, c: 5, s: 3.4 },
  { n: "\u4E16\u754C\u306E\u30AD\u30C3\u30C1\u30F3\u30AB\u30FC \u30EB\u30FC\u30ED\u30FC\u98EF", mn: "\u3054\u98EF", sb: [], k: 316, p: 7, f: 5.7, c: 59.2, s: 2.8 },
  { n: "\u53F0\u6E7E\u30E1\u30B7", mn: "\u3054\u98EF", sb: [], k: 376, p: 8.4, f: 6.5, c: 71, s: 3.2 },
  { n: "\u7518\u8F9B\u305D\u307C\u308D \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: [], k: 179, p: 4.3, f: 1.8, c: 36.7, s: 0.9 },
  { n: "\u725B\u30AB\u30EB\u30D3 \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u725B\u8C5A\u8089"], k: 180, p: 4.4, f: 2.3, c: 35, s: 0.9 },
  { n: "\u9752\u78EF\u6D77\u82D4 \u6F2C\u3051\u30B5\u30FC\u30E2\u30F3 \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9B5A\u985E"], k: 182, p: 3.7, f: 2, c: 37.8, s: 0.9 },
  { n: "\u70AD\u706B\u713C\u304D \u9280\u3057\u3083\u3051 \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9B5A\u985E"], k: 182, p: 4.5, f: 2.7, c: 35.9, s: 0.92 },
  { n: "\u304B\u3064\u304A\u9999\u308B \u30B3\u30AF\u65E8\u30C1\u30E3\u30FC\u30B7\u30E5\u30FC \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u725B\u8C5A\u8089"], k: 183, p: 3.5, f: 2, c: 38.2, s: 0.6 },
  { n: "\u9BAD\u3060\u3057\u3054\u306F\u3093\u9BAD\u30DE\u30E8\u30CD\u30FC\u30BA \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9B5A\u985E"], k: 194, p: 3.2, f: 3.6, c: 37.6, s: 0.9 },
  { n: "\u85FB\u5869\u713C\u304D\u9BAD\u30CF\u30E9\u30DF\u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9B5A\u985E"], k: 209, p: 5.2, f: 3.8, c: 38.6, s: 1.1 },
  { n: "\u725B\u713C\u8089 \u30DE\u30E8\u30CD\u30FC\u30BA", mn: "\u304A\u306B\u304E\u308A", sb: ["\u725B\u8C5A\u8089"], k: 210, p: 4.2, f: 3.8, c: 40.1, s: 0.8 },
  { n: "\u9BAD\u3065\u304F\u3057 \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9B5A\u985E"], k: 212, p: 6.6, f: 3.6, c: 38.7, s: 1.1 },
  { n: "\u548C\u725B\u713C\u8089 \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u725B\u8C5A\u8089"], k: 216, p: 34, f: 5, c: 39.6, s: 1.1 },
  { n: "\u30B5\u30FC\u30E2\u30F3\u30DE\u30E8\u30CD\u30FC\u30BA\u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9B5A\u985E"], k: 220, p: 4.1, f: 4.4, c: 41.2, s: 1.1 },
  { n: "\u660E\u592A\u5B50 \u30DE\u30E8\u30CD\u30FC\u30BA \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9B5A\u985E"], k: 228, p: 3.4, f: 4.7, c: 43.3, s: 1.1 },
  { n: "\u30C1\u30E3\u30FC\u30B7\u30E5\u30FC \u30DE\u30E8\u30CD\u30FC\u30BA \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u725B\u8C5A\u8089"], k: 232, p: 4.2, f: 4, c: 44.9, s: 1.4 },
  { n: "\u7099\u308A\u713C\u9D8F\u3064\u304F\u306D\u30DE\u30E8\u30CD\u30FC\u30BA \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9CE5\u985E"], k: 244, p: 5.3, f: 5.3, c: 44, s: 1.3 },
  { n: "\u6D77\u8001\u30DE\u30E8\u30CD\u30FC\u30BA \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9B5A\u985E"], k: 252, p: 4.1, f: 8.1, c: 41.1, s: 0.7 },
  { n: "\u30B9\u30D1\u30E0\u3080\u3059\u3073 \u30C4\u30CA\u30DE\u30E8\u30CD\u30FC\u30BA", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9B5A\u985E"], k: 266, p: 7.3, f: 10.4, c: 36, s: 1.2 },
  { n: "\u3075\u3093\u308F\u308A\u7389\u5B50\u306E\u30AA\u30E0\u30E9\u30A4\u30B9 \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: [], k: 270, p: 7.4, f: 7.6, c: 43.4, s: 3.2 },
  { n: "\u30C1\u30AD\u30F3\u5357\u86EE \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9CE5\u985E"], k: 281, p: 6.5, f: 8.7, c: 44.6, s: 1.1 },
  { n: "\u751F\u305F\u3089\u3053\u3068\u6F2C\u3051\u30DE\u30B0\u30ED\u5165\u308A\u307E\u3050\u308D\u305F\u305F\u304D \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9B5A\u985E"], k: 286, p: 7, f: 2.4, c: 59.8, s: 1.2 },
  { n: "\u5929\u3080\u3059(\u304D\u304F\u3089\u3052\u5165\u308A\u3054\u98EF)", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9B5A\u985E"], k: 303, p: 7.4, f: 3, c: 59.5, s: 2.1 },
  { n: "\u938C\u5009\u9EC4\u91D1\u30E1\u30F3\u30C1 \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u725B\u8C5A\u8089"], k: 329, p: 6.8, f: 15, c: 58.4, s: 1.7 },
  { n: "\u30BD\u30FC\u30B9\u713C\u304D\u305D\u3070&\u7389\u5B50\u713C\u304D \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9EBA\u985E"], k: 340, p: 6.9, f: 11.3, c: 53.6, s: 1.8 },
  { n: "\u539A\u713C\u304D\u7389\u5B50\u3068\u3046\u306A\u304E\u304A\u306B\u304E\u308A\u30BB\u30C3\u30C8", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9B5A\u985E"], k: 353, p: 11.9, f: 8.2, c: 55.1, s: 1.9 },
  { n: "\u30DC\u30F3\u30B4\u76E3\u4FEE\u9D8F\u5510\u63DA\u30DE\u30E8\u30CD\u30FC\u30BA \u304A\u306B\u304E\u308A", mn: "\u304A\u306B\u304E\u308A", sb: ["\u9CE5\u985E"], k: 385, p: 10.2, f: 8.9, c: 66.3, s: 2.4 },
  { n: "on the \u3054\u98EF \u30BF\u30B3\u30E9\u30A4\u30B9", mn: "\u3054\u98EF\u30D7\u30E9\u30B9", sb: [], k: 102, p: 7.5, f: 3.4, c: 10.3, s: 2 },
  { n: "\u30D0\u30BF\u30FC\u30C1\u30AD\u30F3\u30AB\u30EC\u30FC\u7F36\u8A70", mn: "\u3054\u98EF\u30D7\u30E9\u30B9", sb: [], k: 116, p: 2, f: 8.7, c: 7.4, s: 1.4 },
  { n: "1\u98DF\u5206\u306E\u91CE\u83DC&\u98DF\u7269\u7E4A\u7DAD\u30AB\u30EC\u30FC", mn: "\u3054\u98EF\u30D7\u30E9\u30B9", sb: [], k: 118, p: 2, f: 3.5, c: 24.7, s: 2.1 },
  { n: "\u30B0\u30EA\u30FC\u30F3\u30AB\u30EC\u30FC \u7F36\u8A70", mn: "\u3054\u98EF\u30D7\u30E9\u30B9", sb: [], k: 123, p: 2, f: 9.2, c: 8, s: 1.5 },
  { n: "\u53F0\u6E7E\u9EBB\u8FA3", mn: "\u3054\u98EF\u30D7\u30E9\u30B9", sb: [], k: 151, p: 9.3, f: 9.1, c: 8, s: 2.2 },
  { n: "\u30CF\u30EA\u30E9\u98A8\u8C46\u30AB\u30EC\u30FC", mn: "\u3054\u98EF\u30D7\u30E9\u30B9", sb: [], k: 174, p: 15.5, f: 5.6, c: 20.3, s: 2.7 },
  { n: "\u306D\u304E\u3068\u308D", mn: "\u5BFF\u53F8\u985E", sb: ["\u9B5A\u985E"], k: 163, p: 4.3, f: 2, c: 32.4, s: 1.1 },
  { n: "\u7D0D\u8C46\u5DFB\u304D", mn: "\u5BFF\u53F8\u985E", sb: [], k: 166, p: 5.6, f: 1.8, c: 33.1, s: 1.25 },
  { n: "\u30DE\u30B0\u30ED\u305F\u305F\u304D \u308F\u3055\u3073\u91A4\u6CB9\u5DFB", mn: "\u5BFF\u53F8\u985E", sb: ["\u9B5A\u985E"], k: 169, p: 5.2, f: 1.7, c: 34, s: 1.7 },
  { n: "\u9752\u3057\u305D\u7D0D\u8C46 \u5DFB", mn: "\u5BFF\u53F8\u985E", sb: [], k: 174, p: 5.5, f: 2.1, c: 34.1, s: 1.3 },
  { n: "\u7D0D\u8C46\u7D30\u5DFB\u304D 9\u5DFB", mn: "\u5BFF\u53F8\u985E", sb: [], k: 175, p: 5.3, f: 2.1, c: 34, s: 1.1 },
  { n: "\u4F4E\u6E29\u719F\u6210 \u7D0D\u8C46\u5DFB", mn: "\u5BFF\u53F8\u985E", sb: [], k: 179, p: 5.5, f: 2.4, c: 34.7, s: 1.3 },
  { n: "\u306D\u304E\u3068\u308D\u4E2D\u5DFB(7\u5DFB)", mn: "\u5BFF\u53F8\u985E", sb: ["\u9B5A\u985E"], k: 231, p: 11.9, f: 6.3, c: 30.8, s: 1.4 },
  { n: "\u30B5\u30F3\u30C9\u5BFF\u53F8 \u30B5\u30FC\u30E2\u30F3\u30DD\u30AD\u98A8", mn: "\u5BFF\u53F8\u985E", sb: ["\u9B5A\u985E"], k: 244, p: 5.9, f: 3.6, c: 47.6, s: 2 },
  { n: "\u4E09\u7A2E\u306E\u30DE\u30B0\u30ED\u305F\u305F\u304D\u5DFB 6\u5DFB", mn: "\u5BFF\u53F8\u985E", sb: ["\u9B5A\u985E"], k: 244, p: 10.4, f: 5.9, c: 37.3, s: 1.4 },
  { n: "\u7C97\u633D\u304D\u307E\u3050\u308D\u305F\u305F\u304D\u4E2D\u5DFB 10\u5DFB", mn: "\u5BFF\u53F8\u985E", sb: ["\u9B5A\u985E"], k: 250, p: 15, f: 7, c: 36, s: 2 },
  { n: "\u306D\u304E\u3068\u308D&\u30B5\u30FC\u30E2\u30F3\u4E2D\u5DFB", mn: "\u5BFF\u53F8\u985E", sb: ["\u9B5A\u985E"], k: 256, p: 10.8, f: 5.7, c: 39.1, s: 2.1 },
  { n: "\u9B5A\u60A6\u6D77\u9BAE\u592A\u5DFB\uFF08\u30B5\u30FC\u30E2\u30F3\u5165\u308A\uFF094\u5DFB(\u63A8\u5B9A)", mn: "\u5BFF\u53F8\u985E", sb: ["\u9B5A\u985E"], k: 261, p: 8.6, f: 4, c: 48.6, s: 1.8 },
  { n: "\u304A\u624B\u8EFD\u306B\u304E\u308A(\u5DFB\u5BFF\u53F8\u5165\u308A)", mn: "\u5BFF\u53F8\u985E", sb: [], k: 268, p: 12.7, f: 4, c: 43.5, s: 1.8 },
  { n: "\u56FD\u7523\u751F\u672C\u307E\u3050\u308D\u306E\u592A\u5DFB4\u5DFB(\u63A8\u5B9A)", mn: "\u5BFF\u53F8\u985E", sb: ["\u9B5A\u985E"], k: 270, p: 12, f: 5, c: 48, s: 1.8 },
  { n: "\u30B5\u30FC\u30E2\u30F3\u3092\u6109\u3057\u3080!\u6D77\u9BAE\u592A\u5DFB", mn: "\u5BFF\u53F8\u985E", sb: ["\u9B5A\u985E"], k: 272, p: 15.6, f: 6.8, c: 36, s: 2 },
  { n: "\u5E02\u306E\u65E5\u9650\u5B9A\u63E1\u308A 8\u5DFB", mn: "\u5BFF\u53F8\u985E", sb: ["\u9B5A\u985E"], k: 338, p: 11.8, f: 7, c: 56.9, s: 2 },
  { n: "4\u7A2E\u306E\u4E2D\u5DFB\u30BB\u30C3\u30C8", mn: "\u5BFF\u53F8\u985E", sb: ["\u9B5A\u985E"], k: 339, p: 13.1, f: 7.2, c: 53.8, s: 2.6 },
  { n: "\u3046\u306A\u304E\u3065\u304F\u3057", mn: "\u5BFF\u53F8\u985E", sb: ["\u9B5A\u985E"], k: 355, p: 13.6, f: 10, c: 53.1, s: 2 },
  { n: "\u30B5\u30FC\u30E2\u30F3\u306E\u5BFF\u53F8\u8A70\u5408\u305B", mn: "\u5BFF\u53F8\u985E", sb: [], k: 407, p: 15.2, f: 8.8, c: 64.2, s: 2.2 },
  { n: "\u5510\u63DA\u5DFB", mn: "\u5BFF\u53F8\u985E", sb: ["\u9CE5\u985E"], k: 446, p: 9.7, f: 10.8, c: 78.1, s: 3.3 },
  { n: "\u7D00\u6587 \u3068\u3046\u3075\u305D\u3046\u3081\u3093\u98A8", mn: "\u9EBA\u985E", sb: [], k: 87, p: 5, f: 3, c: 11, s: 2 },
  { n: "\u80E1\u9EBB\u3060\u308C\u3067\u98DF\u3079\u308B\u8C46\u8150\u305D\u3046\u3081\u3093\u98A8", mn: "\u9EBA\u985E", sb: [], k: 121, p: 11.5, f: 4, c: 11.2, s: 1.9 },
  { n: "\u30B0\u30EA\u30FC\u30F3\u30AB\u30EC\u30FC/\u30D5\u30A9\u30FC", mn: "\u9EBA\u985E", sb: [], k: 128, p: 3.9, f: 1.6, c: 24.4, s: 3.2 },
  { n: "\u30B5\u30FC\u30E2\u30F3\u30DD\u30AD \u5F69\u308A\u91CE\u83DC&\u30D1\u30B9\u30BF", mn: "\u30B5\u30E9\u30C0", sb: ["\u9EBA\u985E"], k: 170, p: 7, f: 7.3, c: 20, s: 1.9 },
  { n: "\u3086\u305A\u5869\u30E9\u30FC\u30E1\u30F3\u30B5\u30E9\u30C0", mn: "\u30B5\u30E9\u30C0", sb: ["\u9EBA\u985E"], k: 234, p: 12.8, f: 5.8, c: 3, s: 2.2 },
  { n: "\u8D8A\u5F8C\u4F1D\u7D71 \u3078\u304E\u305D\u3070", mn: "\u9EBA\u985E", sb: [], k: 238, p: 8.4, f: 0, c: 51.8, s: 0.87 },
  { n: "\u304A\u624B\u8EFD!\u3072\u3084\u3057\u3076\u3063\u304B\u3051\u305D\u3070", mn: "\u9EBA\u985E", sb: [], k: 244, p: 11.2, f: 4.4, c: 41.6, s: 2.6 },
  { n: "\u30ED\u30FC\u30B9\u30C8\u30C1\u30AD\u30F3\u306E\u30D1\u30B9\u30BF\u30B5\u30E9\u30C0", mn: "\u30B5\u30E9\u30C0", sb: ["\u9EBA\u985E"], k: 249, p: 15.9, f: 6, c: 34.3, s: 2.6 },
  { n: "\u7C97\u633D\u304D\u305D\u3070\u7C89\u4F7F\u7528\u306E\u3056\u308B\u854E\u9EA6", mn: "\u9EBA\u985E", sb: [], k: 263, p: 12.7, f: 1.6, c: 49.5, s: 2.6 },
  { n: "\u3064\u308B\u3057\u3053\u305D\u3070", mn: "\u9EBA\u985E", sb: [], k: 272, p: 8.7, f: 1.5, c: 56, s: 2.6 },
  { n: "\u5473\u5DDD\u67F3 \u3056\u308B\u305D\u3070", mn: "\u9EBA\u985E", sb: [], k: 275, p: 9.6, f: 1.3, c: 56.1, s: 2.2 },
  { n: "\u77F3\u4E38 \u8B83\u5C90\u3046\u3069\u3093", mn: "\u9EBA\u985E", sb: [], k: 283, p: 7.1, f: 1.3, c: 60.7, s: 4.1 },
  { n: "\u77F3\u81FC\u633D\u3056\u308B\u854E\u9EA6", mn: "\u9EBA\u985E", sb: [], k: 284, p: 10.8, f: 2.2, c: 56.4, s: 1.9 },
  { n: "\u30D7\u30C1 UFO", mn: "\u9EBA\u985E", sb: [], k: 284, p: 4.4, f: 11.5, c: 40.7, s: 2.3 },
  { n: "\u91A4\u6CB9\u3068\u3060\u3057\u306E\u30DA\u30DA\u30ED\u30F3\u30C1\u30FC\u30CE", mn: "\u9EBA\u985E", sb: [], k: 306, p: 13.9, f: 8.1, c: 46, s: 4.3 },
  { n: "\u304A\u624B\u8EFD!\u3076\u3063\u304B\u3051\u3046\u3069\u3093", mn: "\u9EBA\u985E", sb: [], k: 323, p: 7.3, f: 3.5, c: 6.3, s: 3.5 },
  { n: "\u934B\u713C\u30AB\u30EC\u30FC\u3046\u3069\u3093", mn: "\u9EBA\u985E", sb: [], k: 330, p: 5.8, f: 3.5, c: 67.6, s: 4.8 },
  { n: "\u4E94\u76EE\u3042\u3093\u304B\u3051\u713C\u304D\u305D\u3070", mn: "\u9EBA\u985E", sb: [], k: 391, p: 11.1, f: 10.7, c: 62.6, s: 3.2 },
  { n: "\u304F\u308B\u307F\u30AF\u30EA\u30FC\u30E0\u3068\u30C8\u30EA\u30E5\u30D5\u306E\u51B7\u88FD\u30AB\u30C3\u30DA\u30EA\u30FC\u30CB", mn: "\u9EBA\u985E", sb: [], k: 532, p: 15.1, f: 27.1, c: 56.4, s: 2.5 },
  { n: "\u5B8C\u5168\u30E1\u30B7 BREAD \u30AB\u30EC\u30FC", mn: "\u30D1\u30F3\u985E", sb: [], k: 213, p: 8.4, f: 6.1, c: 31.4, s: 0.8 },
  { n: "\u5B8C\u5168\u30E1\u30B7 BREAD \u30C1\u30E7\u30B3\u30AF\u30EA\u30FC\u30E0", mn: "\u30D1\u30F3\u985E", sb: [], k: 216, p: 8.7, f: 6.6, c: 32.2, s: 0.3 },
  { n: "\u8CC4\u3044\u30D9\u30FC\u30B3\u30F3\u30C9\u30C3\u30B0(\u63A8\u5B9A)", mn: "\u30D1\u30F3\u985E", sb: [], k: 242, p: 9.4, f: 11.3, c: 26, s: 1.6 },
  { n: "\u5168\u7C92\u7C89\u5165\u308A\u98DF\u30D1\u30F3 \u30ED\u30FC\u30B9\u30C8\u30C1\u30AD\u30F3\u3068\u30C8\u30DE\u30C8\u30B5\u30F3\u30C9", mn: "\u30D1\u30F3\u985E", sb: ["\u9CE5\u985E"], k: 239, p: 13.3, f: 11.9, c: 20.8, s: 1.2 },
  { n: "BASE BREAD \u30C1\u30E7\u30B3\u30EC\u30FC\u30C8", mn: "\u30D1\u30F3\u985E", sb: [], k: 266, p: 13.6, f: 9.1, c: 35.4, s: 0.3 },
  { n: "\u30BF\u30F3\u30D1\u30AF\u8CEA\u304C\u6442\u308C\u308B!\u30E9\u30F3\u30C1BOX", mn: "\u30D1\u30F3\u985E", sb: [], k: 278, p: 29.5, f: 9.4, c: 20.2, s: 1.9 },
  { n: "\u8F9B\u53E3!\u30B9\u30D1\u30A4\u30B7\u30FC\u30C1\u30AD\u30F3\u30D0\u30FC\u30AC\u30FC", mn: "\u30D1\u30F3\u985E", sb: [], k: 331, p: 15.9, f: 10.6, c: 43.4, s: 1.8 },
  { n: "\u3072\u3068\u304F\u3061\u3064\u3064\u307F\u30BD\u30FC\u30BB\u30FC\u30B8\u30D1\u30F3", mn: "\u30D1\u30F3\u985E", sb: [], k: 546, p: 13.8, f: 30.6, c: 54, s: 3 },
  { n: "\u548C\u60E3\u83DC3\u7A2E/\u30D6\u30ED\u30C3\u30B3\u30EA\u30FC\u306E\u3054\u307E\u548C\u3048", mn: "\u30B5\u30E9\u30C0", sb: [], k: 10, p: 0.7, f: 0.3, c: 1.1, s: 0.2 },
  { n: "\u548C\u60E3\u83DC3\u7A2E/\u307B\u3046\u308C\u3093\u8349\u306E\u304A\u3072\u305F\u3057", mn: "\u30B5\u30E9\u30C0", sb: [], k: 11, p: 1.1, f: 0.2, c: 1.3, s: 0.2 },
  { n: "\u548C\u60E3\u83DC3\u7A2E/\u3044\u3093\u3052\u3093\u3068\u30B3\u30FC\u30F3\u30D0\u30BF\u30FC", mn: "\u30B5\u30E9\u30C0", sb: [], k: 11, p: 0.5, f: 0.4, c: 1.4, s: 0.2 },
  { n: "\u9EBB\u8FA3\u3057\u3089\u305F\u304D", mn: "\u30B5\u30E9\u30C0", sb: [], k: 29, p: 1.8, f: 0.8, c: 5.9, s: 1.7 },
  { n: "\u548C\u60E3\u83DC3\u7A2E/\u5408\u8A08", mn: "\u30B5\u30E9\u30C0", sb: [], k: 32, p: 2.3, f: 0.9, c: 3.8, s: 0.6 },
  { n: "\u9EBB\u8FA3\u304D\u3093\u3074\u3089", mn: "\u30B5\u30E9\u30C0", sb: [], k: 32, p: 0.5, f: 0.9, c: 6.1, s: 0.5 },
  { n: "\u7F8E\u5473\u3057\u3044\u8C46\u8150 \u7D79 \u3055\u3068\u306E\u96EA", mn: "\u30B5\u30E9\u30C0", sb: [], k: 50, p: 4.6, f: 2.3, c: 2.6, s: 0.04 },
  { n: "\u8C5A\u3057\u3083\u3076 \u30B5\u30E9\u30C0", mn: "\u30B5\u30E9\u30C0", sb: ["\u725B\u8C5A\u8089"], k: 63, p: 7.7, f: 2.3, c: 3.7, s: 1.15 },
  { n: "\u7D0D\u8C46 \u6975\u5C0F\u7C92\u30AB\u30C3\u30D7", mn: "\u30B5\u30E9\u30C0", sb: [], k: 65, p: 5.1, f: 3, c: 4.4, s: 0.4 },
  { n: "\u56FD\u7523\u76AE\u4ED8\u304D\u3054\u307C\u3046\u306E\u304D\u3093\u3074\u3089", mn: "\u30B5\u30E9\u30C0", sb: [], k: 73, p: 1.4, f: 3.6, c: 8.7, s: 0.9 },
  { n: "\u30AA\u30AF\u30E9\u3068\u3072\u3058\u304D\u306E\u3054\u307E\u548C\u3048", mn: "\u30B5\u30E9\u30C0", sb: [], k: 75, p: 3.6, f: 3, c: 10.4, s: 1.2 },
  { n: "\u84B8\u3057\u9D8F\u3068\u5869\u6606\u5E03\u306E\u3084\u307F\u3064\u304D\u30AD\u30E3\u30D9\u30C4", mn: "\u30B5\u30E9\u30C0", sb: ["\u9CE5\u985E"], k: 73, p: 5.8, f: 3.7, c: 4.9, s: 1.3 },
  { n: "\u63DA\u3052\u3060\u3057\u8C46\u8150", mn: "\u30B5\u30E9\u30C0", sb: [], k: 107, p: 3.8, f: 8.5, c: 3.6, s: 0.02 },
  { n: "\u91CE\u83DC\u306E\u3046\u307E\u5473!\u30DD\u30C6\u30C8\u30B5\u30E9\u30C0(\u5C0F)", mn: "\u30B5\u30E9\u30C0", sb: [], k: 108, p: 1.6, f: 5.8, c: 12.4, s: 0.7 },
  { n: "\u304B\u3064\u304A\u51FA\u6C41\u9999\u308B \u63DA\u3052\u3060\u3057\u8C46\u8150", mn: "\u30B5\u30E9\u30C0", sb: [], k: 110, p: 4.7, f: 6.3, c: 8.8, s: 0.5 },
  { n: "5\u54C1\u76EE\u306E\u3055\u3063\u3071\u308A\u6625\u96E8\u30B5\u30E9\u30C0", mn: "\u30B5\u30E9\u30C0", sb: [], k: 114, p: 2.7, f: 3, c: 20.5, s: 2.5 },
  { n: "\u305F\u307E\u3054&\u30D6\u30ED\u30C3\u30B3\u30EA\u30FC", mn: "\u30B5\u30E9\u30C0", sb: [], k: 116, p: 15.5, f: 5.6, c: 1.8, s: 1.4 },
  { n: "\u3054\u307E\u3060\u308C\u30C1\u30AD\u30F3\u30B5\u30E9\u30C0", mn: "\u30B5\u30E9\u30C0", sb: ["\u9CE5\u985E"], k: 121, p: 12.5, f: 5.9, c: 5.5, s: 1.3 },
  { n: "\u304A\u304A\u304D\u306A\u5929\u3077\u3089", mn: "\u30B5\u30E9\u30C0", sb: [], k: 125, p: 1.4, f: 9.5, c: 8.5, s: 0.1 },
  { n: "\u4E2D\u83EF\u98A8\u6625\u96E8\u30B5\u30E9\u30C0", mn: "\u30B5\u30E9\u30C0", sb: [], k: 134, p: 1.7, f: 4.5, c: 23.1, s: 2.05 },
  { n: "\u4E2D\u83EF\u6625\u96E8\u30B5\u30E9\u30C0", mn: "\u30B5\u30E9\u30C0", sb: [], k: 136, p: 1.5, f: 3.2, c: 25.3, s: 0.7 },
  { n: "\u30CD\u30AE\u30DD\u30F3\u9162\u3067\u98DF\u3079\u308B\u6C34\u9903\u5B50", mn: "\u30B5\u30E9\u30C0", sb: [], k: 140, p: 5.1, f: 6.4, c: 16.4, s: 2.3 },
  { n: "\u5927\u4EBA\u306E\u30DD\u30C6\u30B5\u30E9 \u30B9\u30E2\u30FC\u30AF\u30C1\u30AD\u30F3", mn: "\u30B5\u30E9\u30C0", sb: ["\u9CE5\u985E"], k: 144, p: 6.6, f: 16.5, c: 1.4, s: 0 },
  { n: "\u30ED\u30FC\u30B9\u30C8\u30D3\u30FC\u30D5\u306E\u30DD\u30C6\u30C8\u30B5\u30E9\u30C0", mn: "\u30B5\u30E9\u30C0", sb: ["\u725B\u8C5A\u8089"], k: 149, p: 6.6, f: 6.2, c: 17.4, s: 1.3 },
  { n: "\u30B7\u30E3\u30AD\u30B7\u30E3\u30AD\u6839\u83DC\u30B5\u30E9\u30C0", mn: "\u30B5\u30E9\u30C0", sb: [], k: 158, p: 3.1, f: 10.6, c: 13.9, s: 1.5 },
  { n: "\u51B7\u3084\u3057\u63DA\u3052\u3060\u3057\u8C46\u8150", mn: "\u30B5\u30E9\u30C0", sb: [], k: 192, p: 10.7, f: 11.9, c: 11.2, s: 1.5 },
  { n: "\u539A\u5207\u308A\u30D9\u30FC\u30B3\u30F3\u306E\u30DD\u30C6\u30C8\u30B5\u30E9\u30C0", mn: "\u30B5\u30E9\u30C0", sb: ["\u725B\u8C5A\u8089"], k: 199, p: 4.1, f: 13.4, c: 16.6, s: 1.6 },
  { n: "\u30CD\u30AE\u76DB\u308A!\u51B7\u3057\u63DA\u3052\u51FA\u3057\u8C46\u8150", mn: "\u30B5\u30E9\u30C0", sb: [], k: 219, p: 11.7, f: 14.5, c: 11, s: 1.2 },
  { n: "\u51FA\u6C41\u91A4\u6CB9\u4ED5\u7ACB\u3066\u306E\u6E29\u7389\u7D0D\u8C46", mn: "\u30B5\u30E9\u30C0", sb: [], k: 212, p: 18.2, f: 12.1, c: 10.1, s: 1.3 },
  { n: "\u548C\u98A8\u8C46\u8150\u30CF\u30F3\u30D0\u30FC\u30B0", mn: "\u30B5\u30E9\u30C0", sb: [], k: 218, p: 16.6, f: 7.9, c: 22.4, s: 2.4 },
  { n: "\u30DE\u30AB\u30ED\u30CB\u30B5\u30E9\u30C0 \u5C0F", mn: "\u30B5\u30E9\u30C0", sb: [], k: 224, p: 3.3, f: 16.2, c: 16.1, s: 0.9 },
  { n: "\u91CE\u83DC\u304B\u304D\u63DA\u3052", mn: "\u30B5\u30E9\u30C0", sb: [], k: 373, p: 3.2, f: 28.8, c: 25.3, s: 0.3 },
  { n: "\u30CF\u30C3\u30B7\u30E5\u30C9\u30DD\u30C6\u30C8 139g", mn: "\u30B5\u30E9\u30C0", sb: [], k: 378.1, p: 2.5, f: 26.7, c: 32.3, s: 1.7 },
  { n: "\u6E1B\u5869\u306A\u3081\u3053\u8D64\u3060\u3057", mn: "\u6C41\u7269", sb: [], k: 28, p: 1.6, f: 0.42, c: 4.5, s: 1.2 },
  { n: "\u78EF\u9999\u308B \u3042\u304A\u3055", mn: "\u6C41\u7269", sb: [], k: 28, p: 1.7, f: 0.63, c: 3.9, s: 1.7 },
  { n: "\u6E1B\u5869 \u306A\u3081\u3089\u304B\u3068\u3046\u3075 \u5473\u564C\u6C41", mn: "\u6C41\u7269", sb: [], k: 39, p: 2.3, f: 0.9, c: 5.4, s: 1.2 },
  { n: "\u3054\u308D\u3063\u3068\u9D8F\u3064\u304F\u306D\u3068\u30B7\u30E3\u30AD\u30B7\u30E3\u30AD\u3054\u307C\u3046 \u5473\u564C\u6C41", mn: "\u6C41\u7269", sb: [], k: 39, p: 1.8, f: 1.3, c: 5.1, s: 1.2 },
  { n: "\u30B0\u30EA\u30FC\u30F3\u30AB\u30EC\u30FC\u30B9\u30FC\u30D7", mn: "\u6C41\u7269", sb: [], k: 63, p: 0.8, f: 2.4, c: 9.5, s: 1.1 },
  { n: "\u30B9\u30FC\u30D7\u306F\u308B\u3055\u3081 \u304B\u304D\u305F\u307E", mn: "\u6C41\u7269", sb: [], k: 84, p: 1.8, f: 1.2, c: 16.7, s: 2.2 },
  { n: "\u30B9\u30FC\u30D7\u306F\u308B\u3055\u3081\u30EF\u30F3\u30BF\u30F3", mn: "\u6C41\u7269", sb: [], k: 86, p: 1, f: 1.1, c: 18, s: 2.4 },
  { n: "\u5409\u6751\u5BB6 \u91CE\u83DC\u7551 \u30B9\u30FC\u30D7", mn: "\u6C41\u7269", sb: [], k: 86, p: 2.8, f: 5.3, c: 7.5, s: 3.5 },
  { n: "\u30B9\u30FC\u30D7\u306F\u308B\u3055\u3081\u62C5\u3005\u9EBA", mn: "\u6C41\u7269", sb: [], k: 142, p: 3.1, f: 6, c: 19, s: 2.8 },
  { n: "\u30B9\u30FC\u30D7DELI \u30AF\u30EA\u30FC\u30DF\u30FC\u30AB\u30EB\u30DC\u30CA\u30FC\u30E9", mn: "\u6C41\u7269", sb: [], k: 150, p: 4.7, f: 4, c: 23, s: 1.9 },
  { n: "\u30DF\u30FC\u30C8\u30DC\u30FC\u30EB\u306E\u30AF\u30EA\u30FC\u30E0\u30B9\u30FC\u30D7", mn: "\u6C41\u7269", sb: [], k: 258, p: 10.4, f: 13.1, c: 25.4, s: 2.7 },
  { n: "\u70AD\u706B\u713C\u304D \u3055\u3051\u306E\u5869\u713C\u304D", mn: "\u9B5A\u985E", sb: [], k: 19, p: 3.5, f: 0.4, c: 0.2, s: 0.4 },
  { n: "\u30B7\u30FC\u30C1\u30AD\u30F3\u30DE\u30A4\u30EB\u30C9 \u30AA\u30A4\u30EB\u4E0D\u4F7F\u7528", mn: "\u9B5A\u985E", sb: [], k: 44, p: 10.2, f: 0.3, c: 0.15, s: 0.5 },
  { n: "\u30A8\u30D3\u30DE\u30E8\u30B9\u30C6\u30A3\u30C3\u30AF", mn: "\u9B5A\u985E", sb: [], k: 70, p: 5, f: 2.6, c: 6.7, s: 1.2 },
  { n: "\u56FD\u7523\u30B5\u30D0\u306E\u304A\u308D\u3057\u30DD\u30F3\u9162", mn: "\u9B5A\u985E", sb: [], k: 83, p: 2, f: 3.1, c: 4.6, s: 2.2 },
  { n: "\u30D1\u30F3\u30AC\u30B7\u30A6\u30B9(150g)", mn: "\u9B5A\u985E", sb: [], k: 87, p: 19.4, f: 0.9, c: 0.8, s: 1.1 },
  { n: "\u9280\u9BAD\u306E\u5869\u713C\u304D", mn: "\u9B5A\u985E", sb: [], k: 121, p: 12.4, f: 7.8, c: 0.2, s: 1 },
  { n: "\u9BAD\u30CF\u30E9\u30B9\u306E\u84B2\u713C\u304D", mn: "\u9B5A\u985E", sb: [], k: 130, p: 10.8, f: 8.4, c: 2.8, s: 0.5 },
  { n: "\u3075\u3063\u304F\u3089\u76F4\u706B\u713C\u304D\u3000\u713C\u304D\u304B\u3089\u3075\u3068 \u3057\u3057\u3083\u3082", mn: "\u9B5A\u985E", sb: [], k: 130, p: 11.5, f: 8.9, c: 1.1, s: 0.9 },
  { n: "\u63DA\u3052\u30DC\u30FC\u30EB", mn: "\u9B5A\u985E", sb: [], k: 138, p: 8.4, f: 4.8, c: 15.4, s: 1.8 },
  { n: "\u30A2\u30B8\u306E\u3055\u3063\u3071\u308A\u5357\u86EE\u6F2C\u3051", mn: "\u9B5A\u985E", sb: [], k: 323, p: 21.4, f: 18.4, c: 18.1, s: 2.2 },
  { n: "\u3048\u3073\u3068\u91CE\u83DC\u306E\u304B\u304D\u63DA\u3052(\u63A8\u5B9A)", mn: "\u9B5A\u985E", sb: [], k: 386.5, p: 6.3, f: 25.5, c: 33.3, s: 0.92 },
  { n: "\u30B5\u30FC\u30E2\u30F3\u30CF\u30E9\u30B9 \u307F\u308A\u3093\u713C\u304D", mn: "\u9B5A\u985E", sb: [], k: 461, p: 17.8, f: 41.9, c: 3, s: 1.2 },
  { n: "\u30A2\u30B8\u5927\u8449\u30D5\u30E9\u30A4", mn: "\u9B5A\u985E", sb: [], k: 472, p: 19.5, f: 29.6, c: 30.4, s: 1.6 },
  { n: "\u9D8F\u3055\u3055\u307F\u30D5\u30EC\u30FC\u30AF\u4F4E\u8102\u80AA", mn: "\u9CE5\u985E", sb: [], k: 43, p: 9.7, f: 0.4, c: 0.2, s: 0.6 },
  { n: "\u3084\u304D\u3068\u308A\u68D2 \u305F\u308C", mn: "\u9CE5\u985E", sb: [], k: 87, p: 10, f: 2.6, c: 6, s: 0.9 },
  { n: "\u30C1\u30AD\u30F3&\u305F\u307E\u3054&\u30D6\u30ED\u30C3\u30B3\u30EA\u30FC", mn: "\u30B5\u30E9\u30C0", sb: ["\u9CE5\u985E"], k: 102, p: 13.9, f: 3.5, c: 4.5, s: 1.1 },
  { n: "\u3068\u308A\u305D\u307C\u308D\u3068\u30D0\u30B8\u30EB \u7F36\u8A70", mn: "\u9CE5\u985E", sb: [], k: 118, p: 9.5, f: 7.1, c: 4.1, s: 1.4 },
  { n: "\u7802\u809D\u3068\u7B39\u8EAB\u306E\u71FB\u88FD", mn: "\u9CE5\u985E", sb: [], k: 119, p: 26.8, f: 1.3, c: 0, s: 1.9 },
  { n: "\u306D\u304E\u5869\u30C1\u30AD\u30F3", mn: "\u9CE5\u985E", sb: [], k: 124, p: 14, f: 6, c: 3.9, s: 1.1 },
  { n: "\u713C\u9CE5\u4E32 \u3068\u308A\u304B\u308F\u30BF\u30EC(\u63A8\u5B9A)", mn: "\u9CE5\u985E", sb: [], k: 142, p: 4.8, f: 12.5, c: 3.6, s: 0.6 },
  { n: "\u8304\u5B50\u3068\u5510\u63DA\u3052\u306E\u548C\u98A8\u304A\u308D\u3057\u304B\u3051", mn: "\u30B5\u30E9\u30C0", sb: ["\u9CE5\u985E"], k: 144, p: 7.1, f: 9, c: 9.4, s: 1.3 },
  { n: "\u51B7\u88FD\u56FD\u7523\u9D8F\u30EC\u30D0\u30FC\u716E", mn: "\u9CE5\u985E", sb: [], k: 154, p: 19, f: 5.3, c: 7.6, s: 1.6 },
  { n: "\u82B1\u6912\u9999\u308B!\u3088\u3060\u308C\u9D8F&\u6625\u96E8\u30AD\u30E3\u30D9\u30C4", mn: "\u30B5\u30E9\u30C0", sb: ["\u9CE5\u985E"], k: 163, p: 11.7, f: 7.9, c: 12.3, s: 1.9 },
  { n: "\u30AF\u30EA\u30B9\u30D4\u30FC\u30C1\u30AD\u30F3(\u63A8\u5B9A)", mn: "\u9CE5\u985E", sb: [], k: 183.1, p: 12.2, f: 9.6, c: 11.9, s: 1.4 },
  { n: "\u67D4\u3089\u304B\u3068\u308A\u5929", mn: "\u9CE5\u985E", sb: [], k: 191, p: 13.8, f: 8.6, c: 14, s: 0.5 },
  { n: "\u9CE5\u4E45 \u5510\u63DA\u3052 1\u5207\u308C", mn: "\u9CE5\u985E", sb: [], k: 193, p: 9.6, f: 14, c: 5.7, s: 1.1 },
  { n: "\u713C\u9CE5\u4E09\u7A2E", mn: "\u9CE5\u985E", sb: [], k: 204, p: 19.9, f: 13.7, c: 5.6, s: 2.1 },
  { n: "\u9D8F\u8089\u3068\u91CE\u83DC\u306E\u9ED2\u9162\u3042\u3093", mn: "\u9CE5\u985E", sb: [], k: 222, p: 12.6, f: 11.5, c: 17.7, s: 2 },
  { n: "\u304B\u3089\u3042\u3052\u30AF\u30F3 \u30EC\u30C3\u30C9", mn: "\u9CE5\u985E", sb: [], k: 225, p: 15, f: 15.5, c: 6.3, s: 1.8 },
  { n: "\u91A4\u6CB9\u9999\u308B\u9CE5\u65E8\u5510\u63DA\u3052 100g", mn: "\u9CE5\u985E", sb: [], k: 236, p: 15.7, f: 13.5, c: 1.9, s: 1.3 },
  { n: "\u7279\u88FD\u3068\u308A\u5929(\u5C0F)", mn: "\u9CE5\u985E", sb: [], k: 250, p: 13.4, f: 17.9, c: 9.5, s: 0.6 },
  { n: "\u30D5\u30A1\u30DF\u30C1\u30AD(\u63A8\u5B9A)", mn: "\u9CE5\u985E", sb: [], k: 251.7, p: 12.7, f: 15.7, c: 14.8, s: 1.3 },
  { n: "\u65E8\u3060\u308C\u4ED5\u8FBC\u307F\u306E\u9D8F\u3082\u3082\u5510\u63DA\u3052", mn: "\u9CE5\u985E", sb: [], k: 263, p: 11.6, f: 16.2, c: 15.9, s: 1.6 },
  { n: "\u30EC\u30E2\u30F3\u30BF\u30EB\u30BF\u30EB \u51B7\u305F\u3044\u5357\u86EE\u30C1\u30AD\u30F3", mn: "\u9CE5\u985E", sb: [], k: 268, p: 13.3, f: 15.1, c: 20.2, s: 1.9 },
  { n: "\u51B7\u305F\u3044\u30BF\u30EB\u30BF\u30EB\u30C1\u30AD\u30F3\u5357\u86EE", mn: "\u9CE5\u985E", sb: [], k: 281, p: 13.3, f: 17, c: 19.3, s: 1.9 },
  { n: "\u51B7\u305F\u3044\u307E\u307E\u98DF\u3079\u308B \u30BF\u30EB\u30BF\u30EB\u30C1\u30AD\u30F3\u5357\u86EE", mn: "\u9CE5\u985E", sb: [], k: 294, p: 13.2, f: 18, c: 20.1, s: 1.9 },
  { n: "\u9999\u6E2F\u30EC\u30E2\u30F3\u30C1\u30AD\u30F3(\u63A8\u5B9A/139g)", mn: "\u9CE5\u985E", sb: [], k: 298.8, p: 15.8, f: 15.7, c: 23.6, s: 2.8 },
  { n: "\u3084\u307F\u3064\u304D \u30EC\u30C3\u30C9\u30C1\u30AD\u30F3", mn: "\u9CE5\u985E", sb: [], k: 304, p: 21.6, f: 10.1, c: 31.8, s: 1.5 },
  { n: "\u6B53\u8FCE \u5510\u63DA\u3052 130g(\u63A8\u5B9A\u5024)", mn: "\u9CE5\u985E", sb: [], k: 325, p: 29.3, f: 13.7, c: 18.2, s: 1.8 },
  { n: "\u30C1\u30AD\u30F3\u3068\u8304\u5B50\u306E\u304A\u308D\u3057\u30BD\u30FC\u30B9\u548C\u3048", mn: "\u9CE5\u985E", sb: [], k: 331.8, p: 13.9, f: 24.6, c: 13.6, s: 2.18 },
  { n: "\u9ED2\u9162\u9999\u308B!\u3055\u3063\u3071\u308A\u9162\u9D8F(155g)", mn: "\u9CE5\u985E", sb: [], k: 352, p: 17.4, f: 16.9, c: 33.2, s: 2.5 },
  { n: "\u304A\u3064\u307E\u307F\u4E00\u53E3\u9D8F\u3057\u305D\u9903\u5B50", mn: "\u9CE5\u985E", sb: [], k: 421, p: 10.7, f: 24, c: 40.4, s: 2 },
  { n: "\u9D8F\u3068\u306B\u3093\u306B\u304F\u306E\u82BD\u306E\u9ED2\u80E1\u6912\u548C\u3048 \u4E2D", mn: "\u9CE5\u985E", sb: [], k: 558, p: 29.2, f: 35.8, c: 32.1, s: 1.9 },
  { n: "\u30ED\u30FC\u30B9 \u751F\u30CF\u30E0", mn: "\u725B\u8C5A\u8089", sb: [], k: 28, p: 4.9, f: 0.7, c: 0.5, s: 0.9 },
  { n: "\u751F\u30BD\u30FC\u30BB\u30FC\u30B8/\u30C1\u30E7\u30EA\u30BD\u30FC 1\u672C", mn: "\u725B\u8C5A\u8089", sb: [], k: 79, p: 3.8, f: 6.6, c: 0.3, s: 0.5 },
  { n: "\u751F\u30BD\u30FC\u30BB\u30FC\u30B8/\u30D7\u30EC\u30FC\u30F3 1\u672C", mn: "\u725B\u8C5A\u8089", sb: [], k: 84.8, p: 3.3, f: 7.4, c: 0.3, s: 0.4 },
  { n: "\u8C5A\u30CF\u30E9\u30DF\u713C\u304D", mn: "\u725B\u8C5A\u8089", sb: [], k: 163, p: 13.4, f: 11, c: 2.7, s: 1.4 },
  { n: "\u6B53\u8FCE \u9752\u6912\u8089\u7D72 140g(\u63A8\u5B9A\u5024)", mn: "\u725B\u8C5A\u8089", sb: [], k: 207, p: 1, f: 16, c: 6.4, s: 1.6 },
  { n: "\u30B8\u30E7\u30F3\u30BD\u30F3\u30F4\u30A3\u30EB \u30AA\u30EA\u30B8\u30CA\u30EB(65g/1\u672C)", mn: "\u725B\u8C5A\u8089", sb: [], k: 210, p: 7.5, f: 19.4, c: 1.3, s: 1.2 },
  { n: "\u4E8C\u5C64\u4ED5\u7ACB\u3066\u306E\u30E1\u30F3\u30C1\u30AB\u30C4", mn: "\u725B\u8C5A\u8089", sb: [], k: 312, p: 10.3, f: 21.4, c: 21, s: 1.1 },
  { n: "\u8C5A\u30D2\u30EC\u304B\u3064 3\u500B(\u63A8\u5B9A)", mn: "\u725B\u8C5A\u8089", sb: [], k: 312, p: 19.2, f: 16.5, c: 21.3, s: 0.9 },
  { n: "\u3042\u307E\u306B\u8C5A\u306E\u65E8\u307F!\u30B8\u30E5\u30FC\u30B7\u30FC\u713C\u58F2(5\u500B)", mn: "\u725B\u8C5A\u8089", sb: [], k: 335, p: 20, f: 13.5, c: 36.5, s: 2.5 },
  { n: "\u30A6\u30A4\u30F3\u30CA\u30FC\u6625\u5DFB", mn: "\u725B\u8C5A\u8089", sb: [], k: 350, p: 9, f: 24, c: 24, s: 2 },
  { n: "\u8C5A\u306E\u3057\u3087\u3046\u304C\u713C\u304D", mn: "\u725B\u8C5A\u8089", sb: [], k: 400, p: 13.8, f: 27, c: 26.8, s: 2.5 },
  { n: "\u304A\u8089\u5C4B\u3055\u3093\u306E\u60E3\u83DC \u539A\u5207\u308A\u30CF\u30E0\u30AB\u30C4", mn: "\u725B\u8C5A\u8089", sb: [], k: 403, p: 15.7, f: 25.4, c: 28, s: 3 },
  { n: "\u8C5A\u8089\u3068\u7389\u306D\u304E\u306E\u4E32\u30AB\u30C4", mn: "\u725B\u8C5A\u8089", sb: [], k: 459, p: 11.7, f: 29.4, c: 36.6, s: 1.6 },
  { n: "\u548C\u3048\u308B\u30D1\u30B9\u30BF\u30BD\u30FC\u30B9 \u30DA\u30DA\u30ED\u30F3\u30C1\u30FC\u30CE", mn: "\u5473\u4ED8\u3051", sb: [], k: 55, p: 0.6, f: 4.6, c: 2.9, s: 2.4 },
  { n: "\u5177\u5165\u308A\u3064\u3086 \u53F0\u6E7E\u307E\u305C\u305D\u3070\u98A8", mn: "\u5473\u4ED8\u3051", sb: [], k: 61, p: 4.4, f: 1.4, c: 8, s: 2.6 },
  { n: "\u9B5A\u7C89\u5165\u308A \u8089\u3046\u3069\u3093\u306E\u7D20", mn: "\u5473\u4ED8\u3051", sb: [], k: 68, p: 6.8, f: 0.9, c: 8.1, s: 3.1 },
  { n: "\u6FC3\u3044\u30AC\u30FC\u30EA\u30C3\u30AF\u30C8\u30DE\u30C8 \u30BD\u30FC\u30B9", mn: "\u5473\u4ED8\u3051", sb: [], k: 77, p: 1.7, f: 2.6, c: 11.8, s: 3.6 },
  { n: "\u5177\u9EBA \u725B\u3060\u3057 \u3076\u3063\u304B\u3051", mn: "\u5473\u4ED8\u3051", sb: [], k: 81, p: 4.7, f: 2, c: 11.6, s: 2.4 },
  { n: "\u30AC\u30EA\u30D0\u30BF\u91A4\u6CB9 \u30BD\u30FC\u30B9", mn: "\u5473\u4ED8\u3051", sb: [], k: 84, p: 1.7, f: 6.7, c: 4.2, s: 2.2 },
  { n: "\u5177\u9EBA \u5766\u3005\u305D\u3046\u3081\u3093", mn: "\u5473\u4ED8\u3051", sb: [], k: 84, p: 4.1, f: 4, c: 8.6, s: 2.8 },
  { n: "\u5177\u5165\u308A \u6C41\u7121\u3057 \u62C5\u3005\u9EBA \u30D7\u30C1\u30C3\u3068\u3046\u3069\u3093", mn: "\u5473\u4ED8\u3051", sb: [], k: 98, p: 2.9, f: 5.9, c: 8.3, s: 2.3 },
  { n: "S&B \u30DA\u30DA\u30ED\u30F3\u30C1\u30FC\u30CE", mn: "\u5473\u4ED8\u3051", sb: [], k: 100, p: 0.9, f: 10, c: 1.5, s: 2.2 },
  { n: "\u30A2\u30E9\u30D3\u30A2\u30FC\u30BF", mn: "\u5473\u4ED8\u3051", sb: [], k: 101, p: 2.2, f: 5.5, c: 10.6, s: 2.2 },
  { n: "\u8F9B\u8F9B\u9B5A \u307E\u305C\u9EBA\u306E\u7D20", mn: "\u5473\u4ED8\u3051", sb: [], k: 104, p: 2.3, f: 9.4, c: 2.5, s: 2.4 },
  { n: "\u304A\u3060\u3057\u304C\u3057\u307F\u305F\u304D\u3056\u307F\u3042\u3052(100g)", mn: "\u5473\u4ED8\u3051", sb: [], k: 429, p: 21.9, f: 21.3, c: 37.9, s: 5.1 },
  { n: "\u3061\u3087\u3053\u3063\u3068\u9D8F\u305D\u307C\u308D\u3054\u98EF", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u9CE5\u985E"], k: 275, p: 9.9, f: 4.9, c: 47.8, s: 1.5 },
  { n: "\u7099\u308A\u713C\u304D\u9D8F\u3054\u306F\u3093", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u9CE5\u985E"], k: 359, p: 13.3, f: 5.2, c: 65.2, s: 1.5 },
  { n: "\u30B3\u30AF\u65E8\u7518\u8F9B\u30BF\u30EC\u306E\u8C5A\u4E3C", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u725B\u8C5A\u8089"], k: 379, p: 19.1, f: 9, c: 55.4, s: 1.6 },
  { n: "\u6C17\u4ED9\u6CBC\u7523\u30B5\u30F3\u30DE\u3068\u91CE\u83DC\u306E\u3053\u3060\u308F\u308A\u9ED2\u9162\u3042\u3093\u5F01\u5F53", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u9B5A\u985E"], k: 408, p: 10.8, f: 13.5, c: 63.6, s: 3.6 },
  { n: "20\u54C1\u76EE\u304C\u6442\u308C\u308B\u9EC4\u91D1\u751F\u59DC\u306E\u7384\u7C73\u3054\u306F\u3093\u5F01\u5F53", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: [], k: 416, p: 16.5, f: 9.7, c: 65.2, s: 2.4 },
  { n: "\u3064\u304F\u306D\u3068\u91CE\u83DC\u306E\u9ED2\u9162\u3042\u3093\u5F01\u5F53", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u9CE5\u985E"], k: 419, p: 11.4, f: 8.9, c: 72.2, s: 2 },
  { n: "\u751F\u59DC\u3054\u98EF\u3068\u3068\u3093\u304B\u3064\u5375\u3068\u3058\u98A8", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u725B\u8C5A\u8089"], k: 439, p: 10.8, f: 15, c: 65.1, s: 2.9 },
  { n: "\u304B\u3089\u63DA\u3052\u306E\u9ED2\u9162\u3042\u3093\u304B\u3051\u3068\u62BC\u3057\u9EA6\u3054\u306F\u3093", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u9CE5\u985E"], k: 449, p: 12, f: 12, c: 75, s: 2.3 },
  { n: "\u6D77\u8001\u3068\u91CE\u83DC\u306E\u5929\u4E3C", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u9B5A\u985E"], k: 458, p: 8.6, f: 12.3, c: 80, s: 2.79 },
  { n: "\u590F\u306E\u8CD1\u308F\u3044\u884C\u697D\u5F01\u5F53", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: [], k: 458, p: 20.2, f: 12.4, c: 66.3, s: 3.1 },
  { n: "\u306D\u304E\u5869\u30EC\u30E2\u30F3\u8C5A\u30BF\u30F3\u91CD", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u725B\u8C5A\u8089"], k: 474, p: 22.6, f: 12.6, c: 70.4, s: 2.6 },
  { n: "\u3046\u306A\u304E\u307E\u3076\u3057\u4E3C&\u8B83\u5C90\u3046\u3069\u3093\u30BB\u30C3\u30C8(\u63A8\u5B9A\u5024)", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u9B5A\u985E"], k: 475, p: 12.7, f: 6.2, c: 87.1, s: 3.8 },
  { n: "\u30B5\u30FC\u30E2\u30F3\u6D77\u9BAE\u4E3C", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u9B5A\u985E"], k: 475, p: 22.1, f: 15.2, c: 57.7, s: 2.5 },
  { n: "\u9D8F\u3081\u3057\u3068\u30C1\u30AD\u30F3\u5357\u86EE \u5FA1\u81B3", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u9CE5\u985E"], k: 496, p: 18.3, f: 15.6, c: 70.5, s: 3.2 },
  { n: "\u660E\u592A\u5510\u63DA\u306E\u308A\u5F01\u5F53", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u9CE5\u985E"], k: 529, p: 21, f: 18.4, c: 71.3, s: 2.31 },
  { n: "\u7126\u304C\u3057\u91A4\u6CB9\u4ED5\u7ACB\u3066\u306E\u9D8F\u305D\u307C\u308D\u3054\u306F\u3093", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u9CE5\u985E"], k: 494, p: 24.5, f: 13.3, c: 65.2, s: 2.8 },
  { n: "\u9D8F\u3068\u91CE\u83DC\u306E\u3053\u3060\u308F\u308A\u9ED2\u9162\u3042\u3093\u5F01\u5F53", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u9CE5\u985E"], k: 568, p: 24.2, f: 17.9, c: 76.9, s: 6.2 },
  { n: "\u725B\u3068\u8C5A\u306E\u6B32\u5F35\u308A\u98DF\u3079\u6BD4\u3079\u91CD", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u725B\u8C5A\u8089"], k: 581, p: 22.1, f: 17.1, c: 84.7, s: 2 },
  { n: "\u5929\u4E3C&\u8B83\u5C90\u3046\u3069\u3093\u30BB\u30C3\u30C8", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u9B5A\u985E"], k: 596, p: 11.1, f: 20.9, c: 88.8, s: 2.3 },
  { n: "\u3060\u3057\u3058\u3085\u308F\u5510\u63DA\u3052\u5F01\u5F53", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u9CE5\u985E"], k: 599, p: 25.1, f: 15.5, c: 90.8, s: 3.7 },
  { n: "\u30B0\u30EA\u30FC\u30F3\u30AB\u30EC\u30FC", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: [], k: 666, p: 19.4, f: 34.9, c: 67.3, s: 2.3 },
  { n: "\u539A\u5207\u308A\u8C5A\u30D2\u30EC\u30AB\u30C4\u306E\u3068\u308D\u7389\u91CD", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u725B\u8C5A\u8089"], k: 710, p: 27.6, f: 27.7, c: 89.6, s: 2.8 },
  { n: "\u725B\u713C\u8089\u91CD", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u725B\u8C5A\u8089"], k: 716, p: 18.2, f: 26.5, c: 105.1, s: 2.1 },
  { n: "\u30CD\u30AE\u5869\u8C5A\u30AB\u30EB\u30D3\u91CD", mn: "\u304A\u5F01\u5F53/\u4E3C", sb: ["\u725B\u8C5A\u8089"], k: 757, p: 17, f: 40.2, c: 85.4, s: 2 },
  { n: "\u30AA\u30A4\u30B3\u30B9 \u30D7\u30EC\u30FC\u30F3\u52A0\u7CD6", mn: "\u304A\u83D3\u5B50\u985E", sb: [], k: 95, p: 11, f: 0, c: 12.4, s: 0 },
  { n: "in \u30BC\u30EA\u30FC \u30E9\u30E0\u30CD\u5473", mn: "\u304A\u83D3\u5B50\u985E", sb: [], k: 128, p: 0, f: 0, c: 31.9, s: 0.2 },
  { n: "1\u672C\u6E80\u8DB3\u30D0\u30FC", mn: "\u304A\u83D3\u5B50\u985E", sb: [], k: 188, p: 1.6, f: 10, c: 23.9, s: 0.14 }
];
const C = {
  bg: "#15170F",
  surface: "#1C1F16",
  surfaceMuted: "#242820",
  border: "#33372C",
  borderStrong: "#4A4F3F",
  text: "#F3F2EC",
  textMuted: "#A9A894",
  accent: "#A855F7",
  accentSoft: "#2E1F3D",
  danger: "#F2685F",
  success: "#5FD98A",
  warnBg: "#3A2F12",
  warnText: "#F2C97A"
};
const SLOT_COLORS = ["#6FB8F2", "#F2A93C", "#5FD98A", "#F27DC0", "#B478F2", "#F2D93C", "#C9C6B8"];
const colorForIndex = (i) => SLOT_COLORS[i % SLOT_COLORS.length];
const CATEGORY_ORDER = ["\u98F2\u6599", "\u3054\u98EF", "\u304A\u306B\u304E\u308A", "\u3054\u98EF\u30D7\u30E9\u30B9", "\u30D1\u30F3\u985E", "\u5BFF\u53F8\u985E", "\u9EBA\u985E", "\u30B5\u30E9\u30C0", "\u6C41\u7269", "\u9B5A\u985E", "\u9CE5\u985E", "\u725B\u8C5A\u8089", "\u5473\u4ED8\u3051", "\u304A\u5F01\u5F53/\u4E3C", "\u304A\u83D3\u5B50\u985E"];
const PALETTE = [
  { bg: "#C9C6B822", text: "#C9C6B8" },
  { bg: "#D8A87622", text: "#D8A876" },
  { bg: "#F2A93C22", text: "#F2A93C" },
  { bg: "#F2D93C22", text: "#F2D93C" },
  { bg: "#5FD98A22", text: "#5FD98A" },
  { bg: "#6FB8F222", text: "#6FB8F2" },
  { bg: "#B478F222", text: "#B478F2" },
  { bg: "#F27DC022", text: "#F27DC0" },
  { bg: "#F2685F22", text: "#F2685F" }
];
const TAG_COLOR_INDEX = {
  \u98F2\u6599: 4,
  \u3054\u98EF: 2,
  \u304A\u306B\u304E\u308A: 0,
  \u3054\u98EF\u30D7\u30E9\u30B9: 1,
  \u30D1\u30F3\u985E: 3,
  \u5BFF\u53F8\u985E: 6,
  \u9EBA\u985E: 2,
  \u30B5\u30E9\u30C0: 4,
  \u6C41\u7269: 8,
  \u9B5A\u985E: 5,
  \u9CE5\u985E: 8,
  \u725B\u8C5A\u8089: 2,
  \u5473\u4ED8\u3051: 3,
  "\u304A\u5F01\u5F53/\u4E3C": 0,
  \u304A\u83D3\u5B50\u985E: 7
};
function parseTrainingMarkdown(text) {
  const headerRe = /^##\s*(\d{4}-\d{2}-\d{2})[（(].*?[）)]\s*体重:\s*([\d.]+)\s*kg/;
  const blocks = text.split(/\n(?=##\s*\d{4}-\d{2}-\d{2})/);
  const out = [];
  blocks.forEach((block) => {
    const lines = block.split("\n");
    const headerMatch = lines[0].match(headerRe);
    if (!headerMatch) return;
    const entry = { date: headerMatch[1] };
    const weight = parseFloat(headerMatch[2]);
    if (!isNaN(weight)) entry.weight = weight;
    const exerciseLines = lines.filter((l) => l.trim().startsWith("- \u5B9F\u65BD:")).map((l) => l.replace(/^-\s*実施:\s*/, "").trim());
    if (exerciseLines.length > 0) entry.training = exerciseLines.join("\n");
    out.push(entry);
  });
  return out;
}
function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r[0] || "").trim() !== "");
}
function parseFoodsCsv(text) {
  const rows = parseCsvText(text);
  if (rows.length < 2) return { foods: [], error: "\u30C7\u30FC\u30BF\u884C\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002" };
  const header = rows[0].map((h) => h.trim());
  const idx = {
    n: header.indexOf("\u540D\u524D"),
    tag: header.indexOf("\u5206\u985E"),
    k: header.indexOf("kcal"),
    p: header.indexOf("\u30BF\u30F3\u30D1\u30AF\u8CEA(g)"),
    f: header.indexOf("\u8102(g)"),
    c: header.indexOf("\u70AD(g)"),
    s: header.indexOf("\u5869(g)")
  };
  if (idx.n < 0 || idx.k < 0) {
    return { foods: [], error: "\u300C\u540D\u524D\u300D\u300Ckcal\u300D\u5217\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u30D8\u30C3\u30C0\u30FC\u884C\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002" };
  }
  const foods = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = (r[idx.n] || "").trim();
    if (!name) continue;
    const tags = idx.tag >= 0 ? (r[idx.tag] || "").split(",").map((t) => t.trim()).filter(Boolean) : [];
    foods.push({
      n: name,
      mn: tags[0] || "\u672A\u5206\u985E",
      sb: tags.slice(1),
      k: parseFloat(r[idx.k]) || 0,
      p: idx.p >= 0 ? parseFloat(r[idx.p]) || 0 : 0,
      f: idx.f >= 0 ? parseFloat(r[idx.f]) || 0 : 0,
      c: idx.c >= 0 ? parseFloat(r[idx.c]) || 0 : 0,
      s: idx.s >= 0 ? parseFloat(r[idx.s]) || 0 : 0
    });
  }
  return { foods, error: null };
}
function colorForTag(tag, order) {
  if (tag in TAG_COLOR_INDEX) return PALETTE[TAG_COLOR_INDEX[tag]];
  const idx = order.indexOf(tag);
  return PALETTE[(idx >= 0 ? idx : tag.length) % PALETTE.length];
}
function mergedTagList(foods, order) {
  const fromFoods = /* @__PURE__ */ new Set();
  foods.forEach((f) => {
    if (f.mn) fromFoods.add(f.mn);
    (f.sb || []).forEach((t) => fromFoods.add(t));
  });
  const extra = Array.from(fromFoods).filter((t) => !order.includes(t)).sort();
  return [...order, ...extra];
}
function matchesTag(f, tag) {
  return f.mn === tag || (f.sb || []).includes(tag);
}
function sortFoods(foods, categoryOrder, activeTag) {
  return [...foods].sort((a, b) => {
    if (activeTag) {
      const aMain = a.mn === activeTag ? 0 : 1;
      const bMain = b.mn === activeTag ? 0 : 1;
      if (aMain !== bMain) return aMain - bMain;
    }
    const ai = categoryOrder.indexOf(a.mn);
    const bi = categoryOrder.indexOf(b.mn);
    const aidx = ai === -1 ? 999 : ai;
    const bidx = bi === -1 ? 999 : bi;
    if (aidx !== bidx) return aidx - bidx;
    if (a.k !== b.k) return a.k - b.k;
    return a.n.localeCompare(b.n, "ja");
  });
}
function TagPill({ tag, order, selected, onClick, small, onRemove, faded }) {
  const col = colorForTag(tag, order);
  return /* @__PURE__ */ React.createElement(
    "span",
    {
      onClick,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: col.bg,
        color: col.text,
        opacity: faded ? 0.6 : 1,
        border: selected ? `1.5px solid ${col.text}` : `1.3px solid ${col.text}55`,
        borderRadius: 6,
        padding: small ? "2px 8px" : "4px 10px",
        fontSize: small ? 11 : 12.5,
        fontWeight: faded ? 400 : 500,
        cursor: onClick ? "pointer" : "default"
      }
    },
    tag,
    onRemove && /* @__PURE__ */ React.createElement("span", { onClick: (e) => {
      e.stopPropagation();
      onRemove();
    }, style: { cursor: "pointer", opacity: 0.7 } }, "\u2715")
  );
}
const fmtISO = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const addDays = (iso, n) => {
  const d = /* @__PURE__ */ new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return fmtISO(d);
};
const WEEKDAY = ["\u65E5", "\u6708", "\u706B", "\u6C34", "\u6728", "\u91D1", "\u571F"];
const fmtJP = (iso) => {
  const d = /* @__PURE__ */ new Date(iso + "T00:00:00");
  return `${d.getFullYear()}\u5E74${d.getMonth() + 1}\u6708${d.getDate()}\u65E5(${WEEKDAY[d.getDay()]})`;
};
async function loadJSON(key, fallback) {
  try {
    const r = await window.storage.get(key, false);
    if (!r) return fallback;
    return JSON.parse(r.value);
  } catch (e) {
    return fallback;
  }
}
async function saveJSON(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), false);
  } catch (e) {
  }
}
const emptyDay = () => ({ weight: null, refeed: false, aiNote: "", training: "", slots: [{ id: "A", items: [] }] });
const nextSlotId = (slots) => {
  if (slots.length === 0) return "A";
  const last = slots[slots.length - 1].id;
  return String.fromCharCode(last.charCodeAt(0) + 1);
};
const newItemId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const dayAddSlot = (day) => ({ ...day, slots: [...day.slots, { id: nextSlotId(day.slots), items: [] }] });
const dayRemoveSlot = (day, slotId) => ({ ...day, slots: day.slots.filter((s) => s.id !== slotId) });
const dayAddFood = (day, slotId, f) => {
  const item = { id: newItemId(), name: f.n, kcal: f.k, p: f.p, f: f.f, c: f.c, salt: f.s, confirmed: true };
  return { ...day, slots: day.slots.map((s) => s.id === slotId ? { ...s, items: [...s.items, item] } : s) };
};
const dayAddUnconfirmed = (day, slotId, name) => {
  const item = { id: newItemId(), name, kcal: 0, p: 0, f: 0, c: 0, salt: 0, confirmed: false };
  return { ...day, slots: day.slots.map((s) => s.id === slotId ? { ...s, items: [...s.items, item] } : s) };
};
const dayRemoveItem = (day, slotId, itemId) => ({
  ...day,
  slots: day.slots.map((s) => s.id === slotId ? { ...s, items: s.items.filter((it) => it.id !== itemId) } : s)
});
const daySlotItems = (day, slotId) => {
  const s = day.slots.find((s2) => s2.id === slotId);
  return s ? s.items.filter((it) => it.confirmed).map((it) => ({ ...it })) : [];
};
const dayPasteSlot = (day, slotId, items) => ({
  ...day,
  slots: day.slots.map((s) => s.id === slotId ? { ...s, items: [...s.items, ...items.map((it) => ({ ...it, id: newItemId() }))] } : s)
});
function IconBtn({ label, onClick, children, danger }) {
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      "aria-label": label,
      title: label,
      onClick,
      style: {
        border: `0.5px solid ${C.border}`,
        background: C.surface,
        borderRadius: 8,
        width: 30,
        height: 30,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: danger ? C.danger : C.text,
        fontSize: 14
      }
    },
    children
  );
}
function Btn({ children, onClick, primary, wide, small }) {
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick,
      style: {
        border: primary ? "none" : `0.5px solid ${C.border}`,
        background: primary ? C.accent : C.surface,
        color: primary ? "#fff" : C.text,
        borderRadius: 8,
        padding: small ? "6px 10px" : "9px 14px",
        fontSize: small ? 12.5 : 13.5,
        fontWeight: 500,
        cursor: "pointer",
        width: wide ? "100%" : void 0
      }
    },
    children
  );
}
function NutrientBars({ totals, target, slots }) {
  const metrics = [
    { key: "kcal", label: "kcal" },
    { key: "p", label: "P" },
    { key: "f", label: "\u8102" },
    { key: "c", label: "\u70AD" },
    { key: "salt", label: "\u5869" }
  ];
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, fontSize: 11, color: C.textMuted, flexWrap: "wrap" } }, slots.map((s, i) => /* @__PURE__ */ React.createElement("span", { key: s.id }, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: colorForIndex(i), marginRight: 3 } }), s.id))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 10 } }, metrics.map((m) => {
    var _a;
    const range = target[m.key] || {};
    const tgt = ((_a = range.max) != null ? _a : range.min) || 1;
    const perSlot = slots.map((s, i) => ({ v: s.totals[m.key], color: colorForIndex(i) }));
    const sum = perSlot.reduce((a, b) => a + b.v, 0);
    const over = sum > tgt;
    const under = range.min != null && sum < range.min;
    const scale = over ? tgt / sum : 1;
    const minPct = range.min != null && range.max != null ? range.min / tgt * 100 : null;
    return /* @__PURE__ */ React.createElement("div", { key: m.key, style: { display: "flex", flexDirection: "column", gap: 5 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 15 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 500 } }, m.label), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 500, color: over ? C.danger : under ? C.warnText : C.text } }, Math.round(sum * 10) / 10, "/", tgt)), /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          position: "relative",
          height: 10,
          border: `1px solid ${C.borderStrong}`,
          borderRadius: 5,
          overflow: "hidden",
          display: "flex",
          background: C.surfaceMuted
        }
      },
      perSlot.map((seg, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { width: `${seg.v * scale * 100 / tgt}%`, background: seg.color } })),
      minPct != null && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", left: `${minPct}%`, top: 0, width: 1, height: "100%", background: C.text, opacity: 0.6 } })
    ));
  })));
}
function FoodResultRow({ f, onPick }) {
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => onPick(f),
      style: {
        padding: "8px 10px",
        fontSize: 12.5,
        cursor: "pointer",
        borderBottom: `0.5px solid ${C.border}`,
        display: "flex",
        justifyContent: "space-between",
        gap: 8
      }
    },
    /* @__PURE__ */ React.createElement("span", null, f.n),
    /* @__PURE__ */ React.createElement("span", { style: { color: C.textMuted, whiteSpace: "nowrap" } }, f.k, "kcal")
  );
}
function FoodAdder({ foods, categoryOrder, onAddFood, onAddUnconfirmed }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [browseTag, setBrowseTag] = useState("");
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const s = q.trim().toLowerCase();
    return foods.filter((f) => f.n.toLowerCase().includes(s) || f.mn.toLowerCase().includes(s) || (f.sb || []).some((t) => t.toLowerCase().includes(s))).slice(0, 8);
  }, [q, foods]);
  const allTags = useMemo(() => mergedTagList(foods, categoryOrder), [foods, categoryOrder]);
  const browseResults = useMemo(() => {
    if (!browseTag) return [];
    return sortFoods(foods.filter((f) => matchesTag(f, browseTag)), categoryOrder, browseTag);
  }, [browseTag, foods, categoryOrder]);
  const pick = (f) => {
    onAddFood(f);
    setQ("");
    setOpen(false);
  };
  const pickFromBrowse = (f) => {
    onAddFood(f);
    setBrowseTag("");
  };
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      value: q,
      onChange: (e) => {
        setQ(e.target.value);
        setOpen(true);
      },
      placeholder: "\u98DF\u54C1\u540D\u3092\u5165\u529B\u2026",
      style: { flex: 1, fontSize: 13, padding: "6px 8px", border: `0.5px solid ${C.border}`, borderRadius: 8 }
    }
  ), /* @__PURE__ */ React.createElement(
    Btn,
    {
      small: true,
      onClick: () => {
        if (!q.trim()) return;
        onAddUnconfirmed(q.trim());
        setQ("");
        setOpen(false);
      }
    },
    "\u4E00\u6642\u8A18\u9332"
  )), open && results.length > 0 && /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        position: "absolute",
        zIndex: 5,
        top: 34,
        left: 0,
        right: 0,
        background: C.surface,
        border: `0.5px solid ${C.border}`,
        borderRadius: 8,
        boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
        maxHeight: 220,
        overflowY: "auto"
      }
    },
    results.map((f) => /* @__PURE__ */ React.createElement(FoodResultRow, { key: f.n, f, onPick: pick }))
  )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: C.textMuted } }, "\u5206\u985E\u304B\u3089\u63A2\u3059:"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } }, allTags.map((t) => /* @__PURE__ */ React.createElement(TagPill, { key: t, tag: t, order: categoryOrder, selected: browseTag === t, onClick: () => setBrowseTag(browseTag === t ? "" : t), small: true }))), browseTag && /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        border: `0.5px solid ${C.border}`,
        borderRadius: 8,
        maxHeight: 220,
        overflowY: "auto",
        background: C.surface
      }
    },
    browseResults.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { padding: 10, fontSize: 12.5, color: C.textMuted } }, "\u8A72\u5F53\u3059\u308B\u98DF\u54C1\u304C\u3042\u308A\u307E\u305B\u3093") : browseResults.map((f) => /* @__PURE__ */ React.createElement(FoodResultRow, { key: f.n, f, onPick: pickFromBrowse }))
  )));
}
function SlotCard({ slot, index, foods, categoryOrder, onCopy, onPaste, onRemoveSlot, onAddFood, onAddUnconfirmed, onRemoveItem }) {
  const totals = slot.totals;
  const unconfirmedCount = slot.items.filter((it) => !it.confirmed).length;
  return /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.1rem" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: colorForIndex(index) } }), slot.id), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, /* @__PURE__ */ React.createElement(IconBtn, { label: "\u3053\u306E\u67A0\u3092\u30B3\u30D4\u30FC", onClick: onCopy }, "\u29C9"), /* @__PURE__ */ React.createElement(IconBtn, { label: "\u8CBC\u308A\u4ED8\u3051", onClick: onPaste }, "\u{1F4CB}"), /* @__PURE__ */ React.createElement(IconBtn, { label: "\u3053\u306E\u67A0\u3092\u524A\u9664", danger: true, onClick: onRemoveSlot }, "\u2715"))), slot.items.length > 0 && /* @__PURE__ */ React.createElement("table", { style: { width: "100%", fontSize: 12.5, borderCollapse: "collapse", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { color: C.textMuted } }, /* @__PURE__ */ React.createElement("td", null, "\u98DF\u54C1\u540D"), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, "kcal"), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, "P"), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, "\u8102"), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, "\u70AD"), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, "\u5869"), /* @__PURE__ */ React.createElement("td", null))), /* @__PURE__ */ React.createElement("tbody", null, slot.items.map((it) => /* @__PURE__ */ React.createElement("tr", { key: it.id }, /* @__PURE__ */ React.createElement("td", { style: { padding: "3px 0" } }, it.name, !it.confirmed && /* @__PURE__ */ React.createElement(
    "span",
    {
      style: {
        background: C.warnBg,
        color: C.warnText,
        fontSize: 10.5,
        padding: "1px 6px",
        borderRadius: 6,
        marginLeft: 6
      }
    },
    "\u672A\u78BA\u5B9A"
  )), it.confirmed ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, it.kcal), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, it.p), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, it.f), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, it.c), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, it.salt)) : /* @__PURE__ */ React.createElement("td", { colSpan: 5, style: { textAlign: "right", color: C.textMuted } }, "\u5F8C\u3067\u6804\u990A\u7D20\u3092\u7DE8\u96C6"), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onRemoveItem(it.id),
      "aria-label": "\u524A\u9664",
      style: { border: "none", background: "none", color: C.textMuted, cursor: "pointer", fontSize: 12 }
    },
    "\u2715"
  )))))), /* @__PURE__ */ React.createElement(FoodAdder, { foods, categoryOrder, onAddFood, onAddUnconfirmed }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", marginTop: 8, fontSize: 12.5, color: C.textMuted } }, "\u5C0F\u8A08 ", totals.kcal, "kcal", unconfirmedCount > 0 ? `(\u672A\u78BA\u5B9A${unconfirmedCount}\u4EF6\u3092\u9664\u304F)` : ""));
}
const emptyFoodForm = () => ({ n: "", mn: "", sub: [], k: "", p: "", f: "", c: "", s: "" });
function FoodFormFields({ form, setForm, allTags, categoryOrder, newTagText, setNewTagText, onAddCategory }) {
  const toggleSub = (t) => setForm((prev) => ({ ...prev, sub: prev.sub.includes(t) ? prev.sub.filter((x) => x !== t) : [...prev.sub, t] }));
  const selectMain = (t) => setForm((prev) => ({ ...prev, mn: prev.mn === t ? "" : t, sub: prev.sub.filter((x) => x !== t) }));
  const addNewTag = () => {
    const t = newTagText.trim();
    if (!t) return;
    onAddCategory(t);
    setNewTagText("");
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("input", { placeholder: "\u98DF\u54C1\u540D", value: form.n, onChange: (e) => setForm({ ...form, n: e.target.value }), style: inputStyle }), /* @__PURE__ */ React.createElement("input", { placeholder: "kcal", value: form.k, onChange: (e) => setForm({ ...form, k: e.target.value }), style: inputStyle }), /* @__PURE__ */ React.createElement("input", { placeholder: "\u30BF\u30F3\u30D1\u30AF\u8CEA(g)", value: form.p, onChange: (e) => setForm({ ...form, p: e.target.value }), style: inputStyle }), /* @__PURE__ */ React.createElement("input", { placeholder: "\u8102\u8CEA(g)", value: form.f, onChange: (e) => setForm({ ...form, f: e.target.value }), style: inputStyle }), /* @__PURE__ */ React.createElement("input", { placeholder: "\u70AD\u6C34\u5316\u7269(g)", value: form.c, onChange: (e) => setForm({ ...form, c: e.target.value }), style: inputStyle }), /* @__PURE__ */ React.createElement("input", { placeholder: "\u5869\u5206(g)", value: form.s, onChange: (e) => setForm({ ...form, s: e.target.value }), style: inputStyle })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: C.textMuted, marginBottom: 6 } }, "\u30E1\u30A4\u30F3\u5206\u985E(1\u3064\u30FB\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u4E00\u89A7\u306E\u4E26\u3073\u9806\u306B\u4F7F\u308F\u308C\u307E\u3059)"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 } }, allTags.map((t) => /* @__PURE__ */ React.createElement(TagPill, { key: t, tag: t, order: categoryOrder, selected: form.mn === t, onClick: () => selectMain(t), small: true }))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: C.textMuted, marginBottom: 6 } }, "\u30B5\u30D6\u5206\u985E(\u8907\u6570\u53EF)"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 } }, allTags.filter((t) => t !== form.mn).map((t) => /* @__PURE__ */ React.createElement(TagPill, { key: t, tag: t, order: categoryOrder, selected: form.sub.includes(t), onClick: () => toggleSub(t), small: true, faded: !form.sub.includes(t) }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("input", { placeholder: "\u65B0\u3057\u3044\u5206\u985E\u3092\u8FFD\u52A0", value: newTagText, onChange: (e) => setNewTagText(e.target.value), style: { ...inputStyle, flex: 1, maxWidth: 200 } }), /* @__PURE__ */ React.createElement(Btn, { small: true, onClick: addNewTag }, "\u5206\u985E\u3092\u8FFD\u52A0")));
}
function FoodEditModal({ food, allTags, categoryOrder, onSave, onClose, onAddCategory }) {
  const [form, setForm] = useState({ n: food.n, mn: food.mn, sub: [...food.sb || []], k: String(food.k), p: String(food.p), f: String(food.f), c: String(food.c), s: String(food.s) });
  const [newTagText, setNewTagText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const save = () => {
    if (!form.n.trim() || !form.k || !form.mn) {
      setErrorMsg("\u98DF\u54C1\u540D\u30FBkcal\u30FB\u30E1\u30A4\u30F3\u5206\u985E\u306F\u5FC5\u9808\u3067\u3059");
      return;
    }
    onSave(food.n, {
      n: form.n.trim(),
      mn: form.mn,
      sb: form.sub,
      k: parseFloat(form.k) || 0,
      p: parseFloat(form.p) || 0,
      f: parseFloat(form.f) || 0,
      c: parseFloat(form.c) || 0,
      s: parseFloat(form.s) || 0
    });
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: onClose,
      style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: (e) => e.stopPropagation(),
        style: { background: C.surface, borderRadius: 14, padding: "1.2rem", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }
      },
      /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, marginBottom: 12 } }, "\u300C", food.n, "\u300D\u3092\u7DE8\u96C6"),
      /* @__PURE__ */ React.createElement(FoodFormFields, { form, setForm, allTags, categoryOrder, newTagText, setNewTagText, onAddCategory }),
      errorMsg && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: C.danger, marginBottom: 8 } }, errorMsg),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement(Btn, { primary: true, onClick: save }, "\u66F4\u65B0\u3059\u308B"), /* @__PURE__ */ React.createElement(Btn, { onClick: onClose }, "\u30AD\u30E3\u30F3\u30BB\u30EB"))
    )
  );
}
const PAGE_SIZE = 100;
function FoodsTab({ foods, categoryOrder, onAdd, onUpdate, onImportMany, onAddCategory }) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [page, setPage] = useState(1);
  const [csvText, setCsvText] = useState("");
  const [csvResult, setCsvResult] = useState(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const allTags = useMemo(() => mergedTagList(foods, categoryOrder), [foods, categoryOrder]);
  const filtered = useMemo(() => {
    const f2 = foods.filter((f) => {
      const okQ = !q.trim() || f.n.toLowerCase().includes(q.trim().toLowerCase());
      const okTag = !tag || matchesTag(f, tag);
      return okQ && okTag;
    });
    return sortFoods(f2, categoryOrder, tag);
  }, [foods, q, tag, categoryOrder]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const paged = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);
  const [form, setForm] = useState(emptyFoodForm());
  const [newTagText, setNewTagText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [editingFood, setEditingFood] = useState(null);
  const submit = () => {
    if (!form.n.trim() || !form.k || !form.mn) {
      setErrorMsg("\u98DF\u54C1\u540D\u30FBkcal\u30FB\u30E1\u30A4\u30F3\u5206\u985E\u306F\u5FC5\u9808\u3067\u3059");
      return;
    }
    onAdd({
      n: form.n.trim(),
      mn: form.mn,
      sb: form.sub,
      k: parseFloat(form.k) || 0,
      p: parseFloat(form.p) || 0,
      f: parseFloat(form.f) || 0,
      c: parseFloat(form.c) || 0,
      s: parseFloat(form.s) || 0
    });
    setForm(emptyFoodForm());
    setErrorMsg("");
  };
  const runCsvImport = async () => {
    setCsvResult(null);
    const parsed = parseFoodsCsv(csvText);
    if (parsed.error) {
      setCsvResult({ error: parsed.error });
      return;
    }
    if (parsed.foods.length === 0) {
      setCsvResult({ error: "\u53D6\u308A\u8FBC\u3081\u308B\u884C\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002" });
      return;
    }
    setCsvBusy(true);
    const r = await onImportMany(parsed.foods);
    setCsvBusy(false);
    setCsvResult(r);
  };
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.1rem" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, marginBottom: 8 } }, "CSV\u3067\u4E00\u62EC\u767B\u9332\u30FB\u66F4\u65B0"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, marginBottom: 10 } }, "Notion\u306A\u3069\u304B\u3089\u66F8\u304D\u51FA\u3057\u305F\u98DF\u54C1DB\u306ECSV\u3092\u305D\u306E\u307E\u307E\u8CBC\u308A\u4ED8\u3051\u3066\u53D6\u308A\u8FBC\u3081\u307E\u3059\u3002\u5217\u306E\u4E26\u3073\u9806\u306F\u81EA\u7531\u3067\u3001\u300C\u540D\u524D\u300D\u300C\u5206\u985E\u300D\u300Ckcal\u300D\u300C\u30BF\u30F3\u30D1\u30AF\u8CEA(g)\u300D\u300C\u8102(g)\u300D\u300C\u70AD(g)\u300D\u300C\u5869(g)\u300D\u3068\u3044\u3046\u898B\u51FA\u3057\u540D\u3067\u5217\u3092\u5224\u5225\u3057\u307E\u3059(\u300C\u5206\u985E\u300D\u306F\u30AB\u30F3\u30DE\u533A\u5207\u308A\u3067\u3001\u5148\u982D\u3092\u30E1\u30A4\u30F3\u5206\u985E\u3068\u3057\u3066\u6271\u3044\u307E\u3059)\u3002\u540C\u3058\u540D\u524D\u306E\u98DF\u54C1\u304C\u65E2\u306B\u3042\u308B\u5834\u5408\u306F\u6570\u5024\u3092\u4E0A\u66F8\u304D\u3057\u3001\u7121\u3044\u5834\u5408\u306F\u65B0\u898F\u767B\u9332\u3057\u307E\u3059\u3002"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: csvText,
      onChange: (e) => setCsvText(e.target.value),
      placeholder: "\u540D\u524D,\u5206\u985E,kcal,\u30BF\u30F3\u30D1\u30AF\u8CEA(g),\u8102(g),\u70AD(g),\u5869(g)\n\u9D8F\u304C\u3086,\u3054\u98EF,100,4.8,1,19,1.4",
      style: { width: "100%", height: 140, fontSize: 11, fontFamily: "monospace", padding: 8, border: `0.5px solid ${C.border}`, borderRadius: 8, marginBottom: 8 }
    }
  ), /* @__PURE__ */ React.createElement(Btn, { primary: true, onClick: runCsvImport }, csvBusy ? "\u53D6\u308A\u8FBC\u307F\u4E2D\u2026" : "CSV\u3092\u53D6\u308A\u8FBC\u3080"), csvResult && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: csvResult.error ? C.danger : C.text, marginTop: 8 } }, csvResult.error ? csvResult.error : `\u65B0\u898F${csvResult.added}\u4EF6\u30FB\u66F4\u65B0${csvResult.updated}\u4EF6\u3092\u53D6\u308A\u8FBC\u307F\u307E\u3057\u305F\u3002`), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: C.textMuted, marginTop: 6 } }, "\u3053\u306E\u53D6\u308A\u8FBC\u307F\u306F\u98DF\u54C1DB\u306E\u307F\u3092\u66F4\u65B0\u3057\u307E\u3059\u3002\u65E2\u306B\u8A18\u9332\u6E08\u307F\u306E\u904E\u53BB\u306E\u98DF\u4E8B\u8A18\u9332\u306E\u6570\u5024\u306F\u5909\u308F\u308A\u307E\u305B\u3093(\u500B\u5225\u306E\u7DE8\u96C6\u30D5\u30A9\u30FC\u30E0\u3067\u4FDD\u5B58\u3057\u305F\u5834\u5408\u306E\u307F\u3001\u904E\u53BB\u306E\u8A18\u9332\u306B\u3082\u53CD\u6620\u3055\u308C\u307E\u3059)\u3002")), /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.1rem" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, marginBottom: 10 } }, "\u65B0\u3057\u3044\u98DF\u54C1\u3092\u767B\u9332"), /* @__PURE__ */ React.createElement(FoodFormFields, { form, setForm, allTags, categoryOrder, newTagText, setNewTagText, onAddCategory }), errorMsg && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: C.danger, marginBottom: 8 } }, errorMsg), /* @__PURE__ */ React.createElement(Btn, { primary: true, onClick: submit }, "\u767B\u9332\u3059\u308B")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      placeholder: "\u98DF\u54C1\u540D\u3067\u691C\u7D22",
      value: q,
      onChange: (e) => {
        setQ(e.target.value);
        setPage(1);
      },
      style: { ...inputStyle }
    }
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } }, /* @__PURE__ */ React.createElement(
    TagPill,
    {
      tag: "\u3059\u3079\u3066",
      order: categoryOrder,
      selected: !tag,
      onClick: () => {
        setTag("");
        setPage(1);
      },
      small: true
    }
  ), allTags.map((t) => /* @__PURE__ */ React.createElement(
    TagPill,
    {
      key: t,
      tag: t,
      order: categoryOrder,
      selected: tag === t,
      onClick: () => {
        setTag(tag === t ? "" : t);
        setPage(1);
      },
      small: true
    }
  )))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: C.textMuted } }, filtered.length, "\u54C1\u3092\u8868\u793A\u4E2D(\u5168", foods.length, "\u54C1) \u30FB ", pageClamped, "/", totalPages, "\u30DA\u30FC\u30B8"), /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("table", { style: { width: "100%", fontSize: 12.5, borderCollapse: "collapse" } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: C.surfaceMuted, color: C.textMuted } }, /* @__PURE__ */ React.createElement("td", { style: cellStyle }, "\u540D\u524D"), /* @__PURE__ */ React.createElement("td", { style: cellStyle }, "\u5206\u985E"), /* @__PURE__ */ React.createElement("td", { style: { ...cellStyle, textAlign: "right" } }, "kcal"), /* @__PURE__ */ React.createElement("td", { style: { ...cellStyle, textAlign: "right" } }, "P"), /* @__PURE__ */ React.createElement("td", { style: { ...cellStyle, textAlign: "right" } }, "\u8102"), /* @__PURE__ */ React.createElement("td", { style: { ...cellStyle, textAlign: "right" } }, "\u70AD"), /* @__PURE__ */ React.createElement("td", { style: { ...cellStyle, textAlign: "right" } }, "\u5869"), /* @__PURE__ */ React.createElement("td", null))), /* @__PURE__ */ React.createElement("tbody", null, paged.map((f) => /* @__PURE__ */ React.createElement("tr", { key: f.n, style: { borderTop: `0.5px solid ${C.border}` } }, /* @__PURE__ */ React.createElement("td", { style: cellStyle }, f.n), /* @__PURE__ */ React.createElement("td", { style: cellStyle }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } }, /* @__PURE__ */ React.createElement(TagPill, { tag: f.mn, order: categoryOrder, small: true }), (f.sb || []).map((t) => /* @__PURE__ */ React.createElement(TagPill, { key: t, tag: t, order: categoryOrder, small: true, faded: true })))), /* @__PURE__ */ React.createElement("td", { style: { ...cellStyle, textAlign: "right" } }, f.k), /* @__PURE__ */ React.createElement("td", { style: { ...cellStyle, textAlign: "right" } }, f.p), /* @__PURE__ */ React.createElement("td", { style: { ...cellStyle, textAlign: "right" } }, f.f), /* @__PURE__ */ React.createElement("td", { style: { ...cellStyle, textAlign: "right" } }, f.c), /* @__PURE__ */ React.createElement("td", { style: { ...cellStyle, textAlign: "right" } }, f.s), /* @__PURE__ */ React.createElement("td", { style: { ...cellStyle, textAlign: "right" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setEditingFood(f), "aria-label": "\u7DE8\u96C6", style: { border: "none", background: "none", color: C.textMuted, cursor: "pointer", fontSize: 12 } }, "\u7DE8\u96C6"))))))), totalPages > 1 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement(IconBtn, { label: "\u524D\u306E\u30DA\u30FC\u30B8", onClick: () => setPage((p) => Math.max(1, p - 1)) }, "\u2190"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12.5, color: C.textMuted } }, pageClamped, " / ", totalPages), /* @__PURE__ */ React.createElement(IconBtn, { label: "\u6B21\u306E\u30DA\u30FC\u30B8", onClick: () => setPage((p) => Math.min(totalPages, p + 1)) }, "\u2192")), editingFood && /* @__PURE__ */ React.createElement(
    FoodEditModal,
    {
      key: editingFood.n,
      food: editingFood,
      allTags,
      categoryOrder,
      onAddCategory,
      onSave: (originalName, payload) => {
        onUpdate(originalName, payload);
        setEditingFood(null);
      },
      onClose: () => setEditingFood(null)
    }
  ));
}
const inputStyle = { fontSize: 13, padding: "7px 9px", border: `0.5px solid ${C.border}`, borderRadius: 8 };
const cellStyle = { padding: "6px 8px" };
function SettingsTab({ target, onSave, categoryOrder, foods, onSaveCategoryOrder }) {
  const [form, setForm] = useState(target);
  useEffect(() => setForm(target), [target]);
  const [order, setOrder] = useState(categoryOrder);
  useEffect(() => setOrder(categoryOrder), [categoryOrder]);
  const fullOrder = useMemo(() => mergedTagList(foods, order), [foods, order]);
  const move = (idx, dir) => {
    const next = [...fullOrder];
    const target2 = idx + dir;
    if (target2 < 0 || target2 >= next.length) return;
    [next[idx], next[target2]] = [next[target2], next[idx]];
    setOrder(next);
  };
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1.2rem", maxWidth: 420 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, marginBottom: 4 } }, "1\u65E5\u306E\u76EE\u6A19\u6442\u53D6\u91CF"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: C.textMuted, marginBottom: 12 } }, "\u76EE\u6A19\u5024\u4EE5\u4E0A\u30FB\u4E0A\u9650\u5024\u4EE5\u5185\u306E\u6442\u53D6\u91CF\u3092\u76EE\u6307\u3057\u307E\u3059\u3002\u3069\u3061\u3089\u304B\u4E00\u65B9\u3060\u3051\u306E\u8A2D\u5B9A\u3082\u53EF\u80FD\u3067\u3059\u3002"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } }, [
    { k: "kcal", label: "\u30AB\u30ED\u30EA\u30FC(kcal)" },
    { k: "p", label: "\u30BF\u30F3\u30D1\u30AF\u8CEA(g)" },
    { k: "f", label: "\u8102\u8CEA(g)" },
    { k: "c", label: "\u70AD\u6C34\u5316\u7269(g)" },
    { k: "salt", label: "\u5869\u5206(g)" }
  ].map((f) => {
    var _a, _b, _c, _d;
    return /* @__PURE__ */ React.createElement("div", { key: f.k, style: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, gap: 8 } }, /* @__PURE__ */ React.createElement("span", null, f.label), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: C.textMuted } }, "\u76EE\u6A19"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        value: (_b = (_a = form[f.k]) == null ? void 0 : _a.min) != null ? _b : "",
        onChange: (e) => setForm({ ...form, [f.k]: { ...form[f.k], min: e.target.value === "" ? null : parseFloat(e.target.value) } }),
        style: { ...inputStyle, width: 72, textAlign: "right" }
      }
    ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: C.textMuted } }, "\u4E0A\u9650"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        value: (_d = (_c = form[f.k]) == null ? void 0 : _c.max) != null ? _d : "",
        onChange: (e) => setForm({ ...form, [f.k]: { ...form[f.k], max: e.target.value === "" ? null : parseFloat(e.target.value) } }),
        style: { ...inputStyle, width: 72, textAlign: "right" }
      }
    )));
  })), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14 } }, /* @__PURE__ */ React.createElement(Btn, { primary: true, onClick: () => onSave(form) }, "\u4FDD\u5B58\u3059\u308B"))), /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1.2rem", maxWidth: 420 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, marginBottom: 4 } }, "\u5206\u985E\u306E\u4E26\u3073\u9806"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: C.textMuted, marginBottom: 10 } }, "\u77E2\u5370\u3067\u5165\u308C\u66FF\u3048\u3066\u3001\u4FDD\u5B58\u3059\u308B\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, fullOrder.map((t, i) => /* @__PURE__ */ React.createElement("div", { key: t, style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => move(i, -1), disabled: i === 0, style: { border: "none", background: "none", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.3 : 1, fontSize: 12 } }, "\u25B2"), /* @__PURE__ */ React.createElement("button", { onClick: () => move(i, 1), disabled: i === fullOrder.length - 1, style: { border: "none", background: "none", cursor: i === fullOrder.length - 1 ? "default" : "pointer", opacity: i === fullOrder.length - 1 ? 0.3 : 1, fontSize: 12 } }, "\u25BC")), /* @__PURE__ */ React.createElement(TagPill, { tag: t, order: fullOrder })))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14 } }, /* @__PURE__ */ React.createElement(Btn, { primary: true, onClick: () => onSaveCategoryOrder(order) }, "\u4FDD\u5B58\u3059\u308B"))));
}
function ImportTab({ onImport, onExportAll, onImportAll }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [backupText, setBackupText] = useState("");
  const [backupCopyMsg, setBackupCopyMsg] = useState("");
  const [restoreText, setRestoreText] = useState("");
  const [restoreResult, setRestoreResult] = useState(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const doExport = async () => {
    setBackupBusy(true);
    const json = await onExportAll();
    setBackupText(json);
    setBackupBusy(false);
  };
  const doCopyBackup = () => {
    var _a;
    (_a = navigator.clipboard) == null ? void 0 : _a.writeText(backupText);
    setBackupCopyMsg("\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F");
    setTimeout(() => setBackupCopyMsg(""), 1500);
  };
  const doRestore = async () => {
    setRestoreResult(null);
    setRestoreBusy(true);
    const r = await onImportAll(restoreText);
    setRestoreBusy(false);
    setRestoreResult(r);
  };
  const run = async () => {
    setResult(null);
    const trimmed = text.trim();
    let arr = null;
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        arr = JSON.parse(trimmed);
        if (!Array.isArray(arr)) throw new Error("\u914D\u5217\u3067\u306F\u3042\u308A\u307E\u305B\u3093");
      } catch (e) {
        setResult({ error: "JSON\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002\u65E5\u4ED8\u3054\u3068\u306E\u30C7\u30FC\u30BF\u306E\u914D\u5217\u3092\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\u3002" });
        return;
      }
    } else {
      arr = parseTrainingMarkdown(trimmed);
      if (arr.length === 0) {
        setResult({ error: "JSON\u914D\u5217\u3001\u307E\u305F\u306F\u30C8\u30EC\u30FC\u30CB\u30F3\u30B0\u30BF\u30A4\u30DE\u30FC\u30A2\u30D7\u30EA\u306E\u30DE\u30FC\u30AF\u30C0\u30A6\u30F3\u51FA\u529B(\u300C## \u65E5\u4ED8\uFF08\u66DC\u65E5\uFF09 \u4F53\u91CD: \u25EF\u25EFkg\u300D\u5F62\u5F0F)\u306E\u3069\u3061\u3089\u306E\u5F62\u5F0F\u3068\u3057\u3066\u3082\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" });
        return;
      }
    }
    setBusy(true);
    const r = await onImport(arr);
    setBusy(false);
    setResult(r);
  };
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 } }, /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.1rem" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, marginBottom: 8 } }, "\u5168\u30C7\u30FC\u30BF\u306E\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7\u30FB\u5225\u306E\u30C1\u30E3\u30C3\u30C8\u3078\u306E\u5F15\u304D\u7D99\u304E"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, marginBottom: 10 } }, "\u3053\u306E\u30A2\u30D7\u30EA\u306E\u4FDD\u5B58\u30C7\u30FC\u30BF(\u98DF\u54C1DB\u30FB\u65E5\u3005\u306E\u8A18\u9332\u30FB\u8A2D\u5B9A\u30FB\u5065\u5EB7\u60C5\u5831\u306A\u3069\u5168\u3066)\u30921\u3064\u306E\u30C7\u30FC\u30BF\u3068\u3057\u3066\u66F8\u304D\u51FA\u305B\u307E\u3059\u3002\u5225\u306E\u30C1\u30E3\u30C3\u30C8\u306B\u3053\u306E\u98DF\u4E8B\u7BA1\u7406\u30A2\u30D7\u30EA\u306E\u30D5\u30A1\u30A4\u30EB\u3092\u958B\u3044\u305F\u969B\u3001\u4E0B\u306E\u300C\u8AAD\u307F\u8FBC\u3080\u300D\u6B04\u306B\u3053\u3053\u3067\u30B3\u30D4\u30FC\u3057\u305F\u5185\u5BB9\u3092\u8CBC\u308A\u4ED8\u3051\u308C\u3070\u3001\u540C\u3058\u5185\u5BB9\u3092\u5F15\u304D\u7D99\u3052\u307E\u3059\u3002"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", marginBottom: 8 } }, /* @__PURE__ */ React.createElement(Btn, { primary: true, onClick: doExport }, backupBusy ? "\u66F8\u304D\u51FA\u3057\u4E2D\u2026" : "\u5168\u30C7\u30FC\u30BF\u3092\u66F8\u304D\u51FA\u3059"), backupText && /* @__PURE__ */ React.createElement(Btn, { small: true, onClick: doCopyBackup }, "\u30B3\u30D4\u30FC"), backupCopyMsg && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: C.accent } }, backupCopyMsg)), backupText && /* @__PURE__ */ React.createElement(
    "textarea",
    {
      readOnly: true,
      value: backupText,
      style: { width: "100%", height: 140, fontSize: 11, fontFamily: "monospace", padding: 8, border: `0.5px solid ${C.border}`, borderRadius: 8, marginBottom: 4 }
    }
  ), /* @__PURE__ */ React.createElement("div", { style: { height: 1, background: C.border, margin: "14px 0" } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, marginBottom: 6 } }, "\u4ED6\u306E\u30C1\u30E3\u30C3\u30C8\u3067\u66F8\u304D\u51FA\u3057\u305F\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u3080"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: restoreText,
      onChange: (e) => setRestoreText(e.target.value),
      placeholder: "\u3053\u3053\u306B\u300C\u5168\u30C7\u30FC\u30BF\u3092\u66F8\u304D\u51FA\u3059\u300D\u3067\u30B3\u30D4\u30FC\u3057\u305F\u5185\u5BB9\u3092\u8CBC\u308A\u4ED8\u3051",
      style: { width: "100%", height: 120, fontSize: 11, fontFamily: "monospace", padding: 8, border: `0.5px solid ${C.border}`, borderRadius: 8, marginBottom: 8 }
    }
  ), /* @__PURE__ */ React.createElement(Btn, { primary: true, onClick: doRestore }, restoreBusy ? "\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026" : "\u3053\u306E\u5185\u5BB9\u3067\u4E0A\u66F8\u304D\u3059\u308B"), restoreResult && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: restoreResult.error ? C.danger : C.text, marginTop: 8 } }, restoreResult.error ? restoreResult.error : `\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F(\u8A18\u9332${restoreResult.count}\u65E5\u5206\u3092\u542B\u3080)\u3002`), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: C.textMuted, marginTop: 6 } }, "\u3053\u306E\u64CD\u4F5C\u306F\u4ECA\u958B\u3044\u3066\u3044\u308B\u30A2\u30D7\u30EA\u306E\u5185\u5BB9\u3092\u5168\u3066\u4E0A\u66F8\u304D\u3057\u307E\u3059\u3002")), /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.1rem" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, marginBottom: 8 } }, "\u904E\u53BB\u306E\u8A18\u9332\u3092\u307E\u3068\u3081\u3066\u53D6\u308A\u8FBC\u3080"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: C.textMuted, lineHeight: 1.6 } }, "Notion\u306A\u3069\u306E\u904E\u53BB\u306E\u98DF\u4E8B\u8A18\u9332\u3092\u5909\u63DB\u3057\u305FJSON\u30C7\u30FC\u30BF\u3001\u307E\u305F\u306F", /* @__PURE__ */ React.createElement("b", null, "\u30C8\u30EC\u30FC\u30CB\u30F3\u30B0\u30BF\u30A4\u30DE\u30FC\u30A2\u30D7\u30EA\u306E\u30DE\u30FC\u30AF\u30C0\u30A6\u30F3\u51FA\u529B(\u4F53\u91CD\u30FB\u5B9F\u65BD\u3057\u305F\u30C8\u30EC\u30FC\u30CB\u30F3\u30B0\u5185\u5BB9)"), "\u3092\u3001\u3053\u3053\u306B\u8CBC\u308A\u4ED8\u3051\u3066\u300C\u53D6\u308A\u8FBC\u3080\u300D\u3092\u62BC\u3059\u3068\u3001\u65E5\u4ED8\u3054\u3068\u306E\u8A18\u9332\u3068\u3057\u3066\u4E00\u62EC\u3067\u4FDD\u5B58\u3055\u308C\u307E\u3059\u3002\u3069\u3061\u3089\u306E\u5F62\u5F0F\u304B\u306F\u81EA\u52D5\u3067\u5224\u5B9A\u3057\u307E\u3059\u3002\u5909\u63DB\u304C\u5FC5\u8981\u306A\u5834\u5408\u306F\u3001\u5143\u306E\u8A18\u9332(Notion\u306E\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u7B49)\u3092Claude\u306B\u6E21\u3057\u3066\u3082\u3089\u3048\u308C\u3070\u3001\u3053\u306E\u5F62\u5F0F\u306B\u5909\u63DB\u3057\u307E\u3059\u3002\u6307\u5B9A\u3057\u305F\u9805\u76EE(\u4F53\u91CD\u30FB\u30C8\u30EC\u30FC\u30CB\u30F3\u30B0\u5185\u5BB9\u306A\u3069)\u3060\u3051\u304C\u66F4\u65B0\u3055\u308C\u3001\u305D\u306E\u65E5\u306B\u65E2\u306B\u3042\u308B\u4ED6\u306E\u8A18\u9332(\u98DF\u4E8B\u5185\u5BB9\u306A\u3069)\u306F\u4FDD\u6301\u3055\u308C\u307E\u3059\u3002")), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: text,
      onChange: (e) => setText(e.target.value),
      placeholder: 'JSON\u4F8B: [{"date":"2026-09-01","weight":76.5,"refeed":false,"slots":[...]}]\n\u307E\u305F\u306F\u30C8\u30EC\u30FC\u30CB\u30F3\u30B0\u30BF\u30A4\u30DE\u30FC\u30A2\u30D7\u30EA\u306E\u30DE\u30FC\u30AF\u30C0\u30A6\u30F3\u51FA\u529B\u3092\u305D\u306E\u307E\u307E\u8CBC\u308A\u4ED8\u3051',
      style: { width: "100%", height: 220, fontSize: 12, fontFamily: "monospace", padding: 8, border: `0.5px solid ${C.border}`, borderRadius: 8 }
    }
  ), /* @__PURE__ */ React.createElement(Btn, { primary: true, onClick: run }, busy ? "\u53D6\u308A\u8FBC\u307F\u4E2D\u2026" : "\u53D6\u308A\u8FBC\u3080"), result && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: result.error ? C.danger : C.text } }, result.error ? result.error : `${result.ok}\u4EF6\u3092\u53D6\u308A\u8FBC\u307F\u307E\u3057\u305F${result.fail ? `(\u5931\u6557${result.fail}\u4EF6)` : ""}\u3002\u65E5\u4ED8\u3092\u79FB\u52D5\u3059\u308B\u3068\u53CD\u6620\u3055\u308C\u307E\u3059\u3002`));
}
function monthGridCells(year, month) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}
function dayTotals(day) {
  const t = { kcal: 0, p: 0, f: 0, c: 0, salt: 0 };
  day.slots.forEach(
    (s) => s.items.forEach((it) => {
      if (it.confirmed) {
        t.kcal += it.kcal;
        t.p += it.p;
        t.f += it.f;
        t.c += it.c;
        t.salt += it.salt;
      }
    })
  );
  return t;
}
function CalendarTab({ target, todayIso, onOpenInHome, onViewSummary }) {
  const todayD = /* @__PURE__ */ new Date(todayIso + "T00:00:00");
  const [viewYear, setViewYear] = useState(todayD.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayD.getMonth());
  const [selectedIso, setSelectedIso] = useState(todayIso);
  const [monthLogs, setMonthLogs] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [refeedOnly, setRefeedOnly] = useState(false);
  useEffect(() => {
    (async () => {
      const ym = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
      const map = {};
      try {
        const listRes = await window.storage.list(`log:${ym}`, false);
        const keys = listRes && listRes.keys || [];
        for (const k of keys) {
          try {
            const r = await window.storage.get(k, false);
            if (r) map[k.replace(/^log:/, "")] = JSON.parse(r.value);
          } catch (e) {
          }
        }
      } catch (e) {
      }
      setMonthLogs(map);
    })();
  }, [viewYear, viewMonth]);
  useEffect(() => {
    (async () => {
      const d = await loadJSON(`log:${selectedIso}`, null);
      setSelectedDay(d ? { ...emptyDay(), ...d } : emptyDay());
    })();
  }, [selectedIso]);
  const persistSelected = (newDay) => {
    setSelectedDay(newDay);
    saveJSON(`log:${selectedIso}`, newDay);
    setMonthLogs((prev) => ({ ...prev, [selectedIso]: newDay }));
  };
  const withTotals = useMemo(() => {
    if (!selectedDay) return [];
    return selectedDay.slots.map((s) => {
      const totals = { kcal: 0, p: 0, f: 0, c: 0, salt: 0 };
      s.items.forEach((it) => {
        if (it.confirmed) {
          totals.kcal += it.kcal;
          totals.p += it.p;
          totals.f += it.f;
          totals.c += it.c;
          totals.salt += it.salt;
        }
      });
      return { ...s, totals };
    });
  }, [selectedDay]);
  const cells = monthGridCells(viewYear, viewMonth);
  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const changeMonth = (delta) => {
    let y = viewYear, m = viewMonth + delta;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setViewYear(y);
    setViewMonth(m);
  };
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.1rem" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement(IconBtn, { label: "\u524D\u306E\u6708", onClick: () => changeMonth(-1) }, "\u2190"), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600, fontSize: 15 } }, viewYear, "\u5E74", viewMonth + 1, "\u6708"), /* @__PURE__ */ React.createElement(IconBtn, { label: "\u6B21\u306E\u6708", onClick: () => changeMonth(1) }, "\u2192")), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.textMuted, cursor: "pointer" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: refeedOnly, onChange: (e) => setRefeedOnly(e.target.checked) }), "\u30EA\u30D5\u30A3\u30FC\u30C9\u30C7\u30A4\u306E\u307F\u8868\u793A")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 4 } }, ["\u65E5", "\u6708", "\u706B", "\u6C34", "\u6728", "\u91D1", "\u571F"].map((w) => /* @__PURE__ */ React.createElement("div", { key: w, style: { textAlign: "center", fontSize: 11, color: C.textMuted, padding: "2px 0" } }, w)), cells.map((d, i) => {
    var _a;
    if (d == null) return /* @__PURE__ */ React.createElement("div", { key: i });
    const iso = `${monthStr}-${String(d).padStart(2, "0")}`;
    const log = monthLogs[iso];
    const hasRecord = !!log && (log.weight != null || log.slots.some((s) => s.items.length > 0));
    const totals = log ? dayTotals(log) : null;
    const maxK = (_a = target.kcal) == null ? void 0 : _a.max;
    const over = totals && maxK != null && totals.kcal > maxK;
    const isToday = iso === todayIso;
    const isSelected = iso === selectedIso;
    const dim = refeedOnly && !(log && log.refeed);
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: iso,
        onClick: () => setSelectedIso(iso),
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          padding: "6px 0",
          borderRadius: 8,
          border: isSelected ? `1.5px solid ${C.accent}` : isToday ? `1.5px solid ${C.borderStrong}` : "1.5px solid transparent",
          background: isSelected ? C.accentSoft : C.surfaceMuted,
          opacity: dim ? 0.3 : 1,
          cursor: "pointer",
          fontSize: 12.5,
          color: C.text
        }
      },
      /* @__PURE__ */ React.createElement("span", null, d),
      /* @__PURE__ */ React.createElement("span", { style: { display: "flex", gap: 2, height: 6 } }, hasRecord && /* @__PURE__ */ React.createElement("span", { style: { width: 6, height: 6, borderRadius: "50%", background: over ? C.danger : C.success } }), (log == null ? void 0 : log.refeed) && /* @__PURE__ */ React.createElement("span", { style: { width: 6, height: 6, borderRadius: "50%", background: "#F2A93C" } }))
    );
  }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end" } }, /* @__PURE__ */ React.createElement(Btn, { small: true, onClick: () => onViewSummary(`${monthStr}-01`) }, "\u3053\u306E\u6708\u306E\u30B5\u30DE\u30EA\u30FC\u3092\u898B\u308B \u2192")), selectedDay && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.1rem", display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600, fontSize: 15 } }, fmtJP(selectedIso)), /* @__PURE__ */ React.createElement(Btn, { small: true, onClick: () => onOpenInHome(selectedIso) }, "\u30DB\u30FC\u30E0\u3067\u7DE8\u96C6\u3059\u308B")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 16, fontSize: 13 } }, /* @__PURE__ */ React.createElement("span", null, "\u4F53\u91CD: ", /* @__PURE__ */ React.createElement("strong", null, selectedDay.weight != null ? `${selectedDay.weight}kg` : "\u672A\u8A18\u9332")), /* @__PURE__ */ React.createElement("span", { style: { color: selectedDay.refeed ? C.warnText : C.textMuted } }, "\u30EA\u30D5\u30A3\u30FC\u30C9\u30C7\u30A4: ", selectedDay.refeed ? "\u306F\u3044" : "\u3044\u3044\u3048")), /* @__PURE__ */ React.createElement(NutrientBars, { target, slots: withTotals })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } }, withTotals.length === 0 || withTotals.every((s) => s.items.length === 0) ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: C.textMuted, textAlign: "center", padding: "1rem" } }, "\u3053\u306E\u65E5\u306E\u8A18\u9332\u306F\u3042\u308A\u307E\u305B\u3093") : withTotals.map((s, i) => /* @__PURE__ */ React.createElement("div", { key: s.id, style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.1rem" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 15, marginBottom: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: colorForIndex(i) } }), s.id), s.items.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: C.textMuted } }, "(\u8A18\u9332\u306A\u3057)") : /* @__PURE__ */ React.createElement("table", { style: { width: "100%", fontSize: 12.5, borderCollapse: "collapse" } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { color: C.textMuted } }, /* @__PURE__ */ React.createElement("td", null, "\u98DF\u54C1\u540D"), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, "kcal"), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, "P"), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, "\u8102"), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, "\u70AD"), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, "\u5869"))), /* @__PURE__ */ React.createElement("tbody", null, s.items.map((it) => /* @__PURE__ */ React.createElement("tr", { key: it.id }, /* @__PURE__ */ React.createElement("td", { style: { padding: "3px 0" } }, it.name, !it.confirmed && /* @__PURE__ */ React.createElement("span", { style: { background: C.warnBg, color: C.warnText, fontSize: 10.5, padding: "1px 6px", borderRadius: 6, marginLeft: 6 } }, "\u672A\u78BA\u5B9A")), it.confirmed ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, it.kcal), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, it.p), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, it.f), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, it.c), /* @__PURE__ */ React.createElement("td", { style: { textAlign: "right" } }, it.salt)) : /* @__PURE__ */ React.createElement("td", { colSpan: 5, style: { textAlign: "right", color: C.textMuted } }, "\u6804\u990A\u7D20\u672A\u78BA\u5B9A"))))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right", fontSize: 12.5, color: C.textMuted, marginTop: 6 } }, "\u5C0F\u8A08 ", s.totals.kcal, "kcal")))), selectedDay.aiNote && /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.1rem" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, fontSize: 13, marginBottom: 8 } }, "AI\u89E3\u6790\u30E1\u30E2"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, whiteSpace: "pre-wrap" } }, selectedDay.aiNote)), /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.1rem" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, fontSize: 13, marginBottom: 8 } }, "\u3053\u306E\u65E5\u306E\u30C8\u30EC\u30FC\u30CB\u30F3\u30B0\u5185\u5BB9"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: selectedDay.training || "",
      onChange: (e) => persistSelected({ ...selectedDay, training: e.target.value }),
      placeholder: "\u30C8\u30EC\u30FC\u30CB\u30F3\u30B0\u30BF\u30A4\u30DE\u30FC\u30A2\u30D7\u30EA\u304B\u3089\u53D6\u308A\u8FBC\u3093\u3060\u5185\u5BB9\u3001\u307E\u305F\u306F\u624B\u52D5\u3067\u306E\u30E1\u30E2",
      style: { width: "100%", height: 90, fontSize: 12.5, padding: 8, border: `0.5px solid ${C.border}`, borderRadius: 8, resize: "vertical" }
    }
  ))));
}
const NUTRIENT_LAYER_COLORS = [SLOT_COLORS[0], SLOT_COLORS[1], SLOT_COLORS[2]];
const startOfWeek = (iso) => {
  const d = /* @__PURE__ */ new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - d.getDay());
  return fmtISO(d);
};
const edgeConnectorPlugin = {
  id: "edgeConnector",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    for (let layer = 0; layer < 3; layer++) {
      const meta = chart.getDatasetMeta(layer);
      const values = chart.data.datasets[layer].data;
      ctx.save();
      ctx.strokeStyle = NUTRIENT_LAYER_COLORS[layer];
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < values.length; i++) {
        if (values[i] == null) continue;
        const el = meta.data[i];
        if (!el) continue;
        const topY = el.y;
        const leftX = el.x - el.width / 2;
        const rightX = el.x + el.width / 2;
        if (!started) {
          ctx.moveTo(leftX, topY);
          started = true;
        } else {
          ctx.lineTo(leftX, topY);
        }
        ctx.lineTo(rightX, topY);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
};
const totalLabelPlugin = {
  id: "totalLabel",
  afterDatasetsDraw(chart, args, opts) {
    const { ctx } = chart;
    const totals = opts.totals || [];
    const meta = chart.getDatasetMeta(2);
    ctx.save();
    ctx.fillStyle = opts.color || "#fff";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i < totals.length; i++) {
      if (totals[i] == null) continue;
      const el = meta.data[i];
      if (!el) continue;
      ctx.fillText(`${totals[i]}kcal`, el.x, el.y - 8);
    }
    ctx.restore();
  }
};
function monthsInRange(startYm, endYm) {
  const out = [];
  let [y, m] = startYm.split("-").map(Number);
  const [ey, em] = endYm.split("-").map(Number);
  while (y < ey || y === ey && m <= em) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}
function SummaryTab({ target, todayIso, requestedPeriod }) {
  const [mode, setMode] = useState("week");
  const [anchor, setAnchor] = useState(todayIso);
  const [rangeStart, setRangeStart] = useState(todayIso.slice(0, 7));
  const [rangeEnd, setRangeEnd] = useState(todayIso.slice(0, 7));
  const [logs, setLogs] = useState({});
  const [latestRecord, setLatestRecord] = useState(null);
  const [subKey, setSubKey] = useState("salt");
  const weightRef = useRef(null);
  const compRef = useRef(null);
  const subRef = useRef(null);
  const weightChart = useRef(null);
  const compChart = useRef(null);
  const subChart = useRef(null);
  useEffect(() => {
    if (requestedPeriod) {
      setMode(requestedPeriod.mode);
      setAnchor(requestedPeriod.anchor);
    }
  }, [requestedPeriod == null ? void 0 : requestedPeriod.token]);
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(`log:${todayIso}`, false);
        if (r) {
          const d = JSON.parse(r.value);
          if (d.weight != null) {
            setLatestRecord({ date: todayIso, weight: d.weight });
            return;
          }
        }
      } catch (e) {
      }
      try {
        const listRes = await window.storage.list("log:", false);
        const keys = (listRes && listRes.keys || []).map((k) => k.replace(/^log:/, "")).filter((d) => d <= todayIso).sort();
        for (let i = keys.length - 1; i >= 0; i--) {
          try {
            const r = await window.storage.get(`log:${keys[i]}`, false);
            if (r) {
              const d = JSON.parse(r.value);
              if (d.weight != null) {
                setLatestRecord({ date: keys[i], weight: d.weight });
                return;
              }
            }
          } catch (e) {
          }
        }
      } catch (e) {
      }
      setLatestRecord(null);
    })();
  }, [todayIso]);
  const periodDates = useMemo(() => {
    if (mode === "week") {
      const start = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    if (mode === "2week") {
      return Array.from({ length: 14 }, (_, i) => addDays(anchor, i - 13));
    }
    if (mode === "month") {
      const d = /* @__PURE__ */ new Date(anchor + "T00:00:00");
      const y = d.getFullYear(), m = d.getMonth();
      const days = new Date(y, m + 1, 0).getDate();
      return Array.from({ length: days }, (_, i) => fmtISO(new Date(y, m, i + 1)));
    }
    if (mode === "monthRange") {
      const [sy, sm] = rangeStart.split("-").map(Number);
      const [ey, em] = rangeEnd.split("-").map(Number);
      const start = fmtISO(new Date(sy, sm - 1, 1));
      const endLastDay = new Date(ey, em, 0).getDate();
      const end = fmtISO(new Date(ey, em - 1, endLastDay));
      const out = [];
      let cur = start;
      while (cur <= end) {
        out.push(cur);
        cur = addDays(cur, 1);
      }
      return out;
    }
    if (mode === "all") {
      const keys = Object.keys(logs).sort();
      if (keys.length === 0) return [];
      const out = [];
      let cur = keys[0];
      const last = keys[keys.length - 1];
      while (cur <= last) {
        out.push(cur);
        cur = addDays(cur, 1);
      }
      return out;
    }
    return [];
  }, [mode, anchor, rangeStart, rangeEnd, logs]);
  useEffect(() => {
    (async () => {
      let map = {};
      try {
        if (mode === "month") {
          const ym = periodDates[0].slice(0, 7);
          const listRes = await window.storage.list(`log:${ym}`, false);
          const keys = listRes && listRes.keys || [];
          const pairs = await Promise.all(
            keys.map(async (k) => {
              try {
                const r = await window.storage.get(k, false);
                return r ? [k.replace(/^log:/, ""), JSON.parse(r.value)] : null;
              } catch (e) {
                return null;
              }
            })
          );
          pairs.forEach((p) => p && (map[p[0]] = p[1]));
        } else if (mode === "monthRange") {
          const months = monthsInRange(rangeStart, rangeEnd);
          const monthMaps = await Promise.all(
            months.map(async (ym) => {
              const m2 = {};
              try {
                const listRes = await window.storage.list(`log:${ym}`, false);
                const keys = listRes && listRes.keys || [];
                const pairs = await Promise.all(
                  keys.map(async (k) => {
                    try {
                      const r = await window.storage.get(k, false);
                      return r ? [k.replace(/^log:/, ""), JSON.parse(r.value)] : null;
                    } catch (e) {
                      return null;
                    }
                  })
                );
                pairs.forEach((p) => p && (m2[p[0]] = p[1]));
              } catch (e) {
              }
              return m2;
            })
          );
          monthMaps.forEach((m2) => Object.assign(map, m2));
        } else if (mode === "all") {
          const listRes = await window.storage.list("log:", false);
          const keys = listRes && listRes.keys || [];
          const pairs = await Promise.all(
            keys.map(async (k) => {
              try {
                const r = await window.storage.get(k, false);
                return r ? [k.replace(/^log:/, ""), JSON.parse(r.value)] : null;
              } catch (e) {
                return null;
              }
            })
          );
          pairs.forEach((p) => p && (map[p[0]] = p[1]));
        } else {
          const pairs = await Promise.all(
            periodDates.map(async (iso) => {
              try {
                const r = await window.storage.get(`log:${iso}`, false);
                return r ? [iso, JSON.parse(r.value)] : null;
              } catch (e) {
                return null;
              }
            })
          );
          pairs.forEach((p) => p && (map[p[0]] = p[1]));
        }
      } catch (e) {
      }
      setLogs(map);
    })();
  }, [mode, anchor, rangeStart, rangeEnd]);
  const series = useMemo(() => {
    const labels = periodDates.map((iso) => {
      const d = /* @__PURE__ */ new Date(iso + "T00:00:00");
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    const weight = [], pKcal = [], fKcal = [], cKcal = [], salt = [], pG = [], fG = [], cG = [];
    periodDates.forEach((iso) => {
      const day = logs[iso];
      weight.push(day && day.weight != null ? day.weight : null);
      const hasAny = day && day.slots.some((s) => s.items.some((it) => it.confirmed));
      if (!hasAny) {
        pKcal.push(null);
        fKcal.push(null);
        cKcal.push(null);
        salt.push(null);
        pG.push(null);
        fG.push(null);
        cG.push(null);
        return;
      }
      const t = dayTotals(day);
      pKcal.push(Math.round(t.p * 4 * 10) / 10);
      fKcal.push(Math.round(t.f * 9 * 10) / 10);
      cKcal.push(Math.round(t.c * 4 * 10) / 10);
      salt.push(Math.round(t.salt * 10) / 10);
      pG.push(Math.round(t.p * 10) / 10);
      fG.push(Math.round(t.f * 10) / 10);
      cG.push(Math.round(t.c * 10) / 10);
    });
    const totalsKcal = periodDates.map((_, i) => pKcal[i] == null ? null : Math.round((pKcal[i] + fKcal[i] + cKcal[i]) * 10) / 10);
    return { labels, weight, pKcal, fKcal, cKcal, salt, pG, fG, cG, totalsKcal };
  }, [logs, periodDates]);
  const kpis = useMemo(() => {
    const weightVals = series.weight.filter((v) => v != null);
    const periodDelta = weightVals.length >= 2 ? Math.round((weightVals[weightVals.length - 1] - weightVals[0]) * 10) / 10 : null;
    const maxWeight = weightVals.length ? Math.max(...weightVals) : null;
    const minWeight = weightVals.length ? Math.min(...weightVals) : null;
    const recordDays = periodDates.filter((iso) => logs[iso]).length;
    return { periodDelta, maxWeight, minWeight, recordDays, totalDays: periodDates.length };
  }, [series, logs, periodDates]);
  useEffect(() => {
    if (!weightRef.current) return;
    if (weightChart.current) weightChart.current.destroy();
    weightChart.current = new Chart(weightRef.current, {
      type: "line",
      data: { labels: series.labels, datasets: [{ data: series.weight, borderColor: SLOT_COLORS[0], backgroundColor: SLOT_COLORS[0], borderWidth: 2, pointRadius: 3, spanGaps: true, tension: 0.25 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: C.textMuted, callback: (v) => v + "kg" } }, x: { ticks: { color: C.textMuted } } } }
    });
    return () => weightChart.current && weightChart.current.destroy();
  }, [series]);
  useEffect(() => {
    if (!compRef.current) return;
    if (compChart.current) compChart.current.destroy();
    compChart.current = new Chart(compRef.current, {
      type: "bar",
      data: {
        labels: series.labels,
        datasets: [
          { data: series.pKcal, backgroundColor: NUTRIENT_LAYER_COLORS[0], stack: "s" },
          { data: series.fKcal, backgroundColor: NUTRIENT_LAYER_COLORS[1], stack: "s" },
          { data: series.cKcal, backgroundColor: NUTRIENT_LAYER_COLORS[2], stack: "s" }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 20 } },
        plugins: { legend: { display: false }, totalLabel: { totals: series.totalsKcal, color: C.text } },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: C.textMuted, maxRotation: 0, autoSkip: series.labels.length > 10 } },
          y: { stacked: true, ticks: { color: C.textMuted, callback: (v) => v + "kcal" } }
        }
      },
      plugins: [edgeConnectorPlugin, totalLabelPlugin]
    });
    return () => compChart.current && compChart.current.destroy();
  }, [series]);
  const nutrientConfigs = {
    salt: { label: "\u5869\u5206", data: series.salt, range: target.salt, color: SLOT_COLORS[5], unit: "g" },
    p: { label: "\u30BF\u30F3\u30D1\u30AF\u8CEA", data: series.pG, range: target.p, color: NUTRIENT_LAYER_COLORS[0], unit: "g" },
    f: { label: "\u8102\u8CEA", data: series.fG, range: target.f, color: NUTRIENT_LAYER_COLORS[1], unit: "g" },
    c: { label: "\u70AD\u6C34\u5316\u7269", data: series.cG, range: target.c, color: NUTRIENT_LAYER_COLORS[2], unit: "g" }
  };
  useEffect(() => {
    var _a, _b;
    if (!subRef.current) return;
    const cfg = nutrientConfigs[subKey];
    const datasets = [{ type: "bar", data: cfg.data, backgroundColor: cfg.color, borderRadius: 4, maxBarThickness: 28 }];
    if (((_a = cfg.range) == null ? void 0 : _a.min) != null) datasets.push({ type: "line", data: series.labels.map(() => cfg.range.min), borderColor: C.textMuted, borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0 });
    if (((_b = cfg.range) == null ? void 0 : _b.max) != null) datasets.push({ type: "line", data: series.labels.map(() => cfg.range.max), borderColor: C.danger, borderWidth: 1.5, borderDash: [2, 3], pointRadius: 0 });
    if (subChart.current) subChart.current.destroy();
    subChart.current = new Chart(subRef.current, {
      type: "bar",
      data: { labels: series.labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: C.textMuted, maxRotation: 0, autoSkip: series.labels.length > 10 } },
          y: { ticks: { color: C.textMuted, callback: (v) => v + cfg.unit } }
        }
      }
    });
    return () => subChart.current && subChart.current.destroy();
  }, [series, subKey, target]);
  const shiftPeriod = (dir) => {
    if (mode === "week") setAnchor(addDays(anchor, dir * 7));
    else if (mode === "2week") setAnchor(addDays(anchor, dir * 14));
    else if (mode === "month") {
      const d = /* @__PURE__ */ new Date(anchor + "T00:00:00");
      d.setMonth(d.getMonth() + dir);
      setAnchor(fmtISO(d));
    }
  };
  const periodLabel = (() => {
    if (mode === "week" || mode === "2week") {
      if (periodDates.length === 0) return "";
      return `${periodDates[0].slice(5).replace("-", "/")}\u301C${periodDates[periodDates.length - 1].slice(5).replace("-", "/")}`;
    }
    if (mode === "month") return `${anchor.slice(0, 4)}\u5E74${parseInt(anchor.slice(5, 7), 10)}\u6708`;
    if (mode === "monthRange") {
      const [sy, sm] = rangeStart.split("-");
      const [ey, em] = rangeEnd.split("-");
      return `${sy}\u5E74${parseInt(sm, 10)}\u6708\u301C${ey}\u5E74${parseInt(em, 10)}\u6708`;
    }
    if (mode === "all") {
      if (periodDates.length === 0) return "\u5168\u671F\u9593(\u8A18\u9332\u306A\u3057)";
      return `\u5168\u671F\u9593(${periodDates[0]}\u301C${periodDates[periodDates.length - 1]})`;
    }
    return "";
  })();
  const exportMd = () => {
    var _a;
    const lines = [`# ${periodLabel} \u30B5\u30DE\u30EA\u30FC`, ""];
    lines.push(`- \u6700\u65B0\u306E\u4F53\u91CD: ${latestRecord && latestRecord.weight != null ? `${latestRecord.weight}kg(${latestRecord.date})` : "-"}`);
    lines.push(`- \u3053\u306E\u671F\u9593\u306E\u4F53\u91CD\u5897\u6E1B: ${kpis.periodDelta != null ? `${kpis.periodDelta > 0 ? "+" : ""}${kpis.periodDelta}kg` : "-"}`);
    lines.push(`- \u671F\u9593\u5185\u306E\u4F53\u91CD\u6700\u5927\u5024: ${kpis.maxWeight != null ? kpis.maxWeight + "kg" : "-"}`);
    lines.push(`- \u671F\u9593\u5185\u306E\u4F53\u91CD\u6700\u5C0F\u5024: ${kpis.minWeight != null ? kpis.minWeight + "kg" : "-"}`);
    lines.push("");
    periodDates.forEach((iso, i) => {
      if (series.totalsKcal[i] == null && series.weight[i] == null) return;
      lines.push(
        `- ${iso}: ${series.totalsKcal[i] != null ? series.totalsKcal[i] + "kcal" : "\u98DF\u4E8B\u8A18\u9332\u306A\u3057"}${series.weight[i] != null ? ` / \u4F53\u91CD${series.weight[i]}kg` : ""}${series.salt[i] != null ? ` / \u5869\u5206${series.salt[i]}g` : ""}`
      );
    });
    (_a = navigator.clipboard) == null ? void 0 : _a.writeText(lines.join("\n"));
  };
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, [
    { k: "week", label: "\u9031" },
    { k: "2week", label: "2\u9031" },
    { k: "month", label: "\u6708" },
    { k: "monthRange", label: "\u6708\u7BC4\u56F2\u6307\u5B9A" },
    { k: "all", label: "\u5168\u671F\u9593" }
  ].map((m) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: m.k,
      onClick: () => setMode(m.k),
      style: {
        border: "none",
        background: mode === m.k ? C.accent : C.surfaceMuted,
        color: mode === m.k ? "#fff" : C.text,
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: 12.5,
        fontWeight: 500,
        cursor: "pointer"
      }
    },
    m.label
  ))), mode === "monthRange" ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 } }, /* @__PURE__ */ React.createElement("input", { type: "month", value: rangeStart, onChange: (e) => setRangeStart(e.target.value), style: { ...inputStyle, padding: "5px 8px", width: 140 } }), /* @__PURE__ */ React.createElement("span", { style: { color: C.textMuted } }, "\u301C"), /* @__PURE__ */ React.createElement("input", { type: "month", value: rangeEnd, onChange: (e) => setRangeEnd(e.target.value), style: { ...inputStyle, padding: "5px 8px", width: 140 } })) : mode === "all" ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14, fontWeight: 500 } }, periodLabel) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement(IconBtn, { label: "\u524D\u306E\u671F\u9593", onClick: () => shiftPeriod(-1) }, "\u2190"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14, fontWeight: 500 } }, periodLabel), /* @__PURE__ */ React.createElement(IconBtn, { label: "\u6B21\u306E\u671F\u9593", onClick: () => shiftPeriod(1) }, "\u2192"))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: C.textMuted, marginBottom: 4 } }, "\u6700\u65B0", latestRecord ? `(${latestRecord.date.slice(5).replace("-", "/")})` : ""), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 500 } }, latestRecord && latestRecord.weight != null ? `${latestRecord.weight}kg` : "-")), /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: C.textMuted, marginBottom: 4 } }, "\u3053\u306E\u671F\u9593\u306E\u5897\u6E1B"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 500, color: kpis.periodDelta > 0 ? C.danger : kpis.periodDelta < 0 ? C.success : C.text } }, kpis.periodDelta != null ? `${kpis.periodDelta > 0 ? "+" : ""}${kpis.periodDelta}kg` : "-")), /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: C.textMuted, marginBottom: 4 } }, "\u6700\u5927\u5024"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 500 } }, kpis.maxWeight != null ? `${kpis.maxWeight}kg` : "-")), /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: C.textMuted, marginBottom: 4 } }, "\u6700\u5C0F\u5024"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, fontWeight: 500 } }, kpis.minWeight != null ? `${kpis.minWeight}kg` : "-"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: C.textMuted, marginBottom: 8 } }, "\u4F53\u91CD\u306E\u63A8\u79FB"), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", width: "100%", height: 160 } }, /* @__PURE__ */ React.createElement("canvas", { ref: weightRef }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 8, fontSize: 12, color: C.textMuted } }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-block", width: 9, height: 9, borderRadius: 2, background: NUTRIENT_LAYER_COLORS[0], marginRight: 4 } }), "\u30BF\u30F3\u30D1\u30AF\u8CEA\u7531\u6765"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-block", width: 9, height: 9, borderRadius: 2, background: NUTRIENT_LAYER_COLORS[1], marginRight: 4 } }), "\u8102\u8CEA\u7531\u6765"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-block", width: 9, height: 9, borderRadius: 2, background: NUTRIENT_LAYER_COLORS[2], marginRight: 4 } }), "\u70AD\u6C34\u5316\u7269\u7531\u6765")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: C.textMuted, marginBottom: 8 } }, "\u7DCF\u6442\u53D6\u30AB\u30ED\u30EA\u30FC\u306E\u5185\u8A33"), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", width: "100%", height: 220 } }, /* @__PURE__ */ React.createElement("canvas", { ref: compRef }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 8 } }, Object.entries(nutrientConfigs).map(([k, cfg]) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: k,
      onClick: () => setSubKey(k),
      style: {
        border: "none",
        background: subKey === k ? C.accent : C.surfaceMuted,
        color: subKey === k ? "#fff" : C.text,
        borderRadius: 8,
        padding: "5px 10px",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer"
      }
    },
    cfg.label
  ))), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", width: "100%", height: 140 } }, /* @__PURE__ */ React.createElement("canvas", { ref: subRef })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: C.textMuted, marginTop: 4 } }, fmtRange(nutrientConfigs[subKey].range, nutrientConfigs[subKey].unit), "(\u7070\u8272\u70B9\u7DDA=\u76EE\u6A19\u3001\u8D64\u8272\u70B9\u7DDA=\u4E0A\u9650)")), /* @__PURE__ */ React.createElement(Btn, { onClick: exportMd }, "\u3053\u306E\u671F\u9593\u3092Markdown\u3067\u30B3\u30D4\u30FC"));
}
function youtubeEmbedUrl(url) {
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else if (u.searchParams.get("v")) id = u.searchParams.get("v");
    else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/embed/")[1];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch (e) {
    return null;
  }
}
const emptyHealthForm = () => ({ title: "", type: "note", content: "" });
function HealthInfoCard({ item, onEdit, onDelete }) {
  return /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.1rem", display: "flex", flexDirection: "column", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600, fontSize: 14 } }, item.title || "(\u7121\u984C)"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, /* @__PURE__ */ React.createElement("button", { onClick: onEdit, style: { border: "none", background: "none", color: C.textMuted, cursor: "pointer", fontSize: 12 } }, "\u7DE8\u96C6"), /* @__PURE__ */ React.createElement("button", { onClick: onDelete, style: { border: "none", background: "none", color: C.danger, cursor: "pointer", fontSize: 12 } }, "\u524A\u9664"))), item.type === "note" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, whiteSpace: "pre-wrap", color: C.text } }, item.content), item.type === "webpage" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, /* @__PURE__ */ React.createElement("a", { href: item.content, target: "_blank", rel: "noreferrer", style: { fontSize: 12.5, color: C.accent } }, item.content), /* @__PURE__ */ React.createElement("iframe", { src: item.content, title: item.title, style: { width: "100%", height: 360, border: `0.5px solid ${C.border}`, borderRadius: 8, background: "#fff" } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: C.textMuted } }, "\u30B5\u30A4\u30C8\u306B\u3088\u3063\u3066\u306F\u57CB\u3081\u8FBC\u307F\u8868\u793A\u3067\u304D\u306A\u3044\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002\u305D\u306E\u969B\u306F\u4E0A\u306E\u30EA\u30F3\u30AF\u304B\u3089\u958B\u3044\u3066\u304F\u3060\u3055\u3044\u3002")), item.type === "youtube" && (youtubeEmbedUrl(item.content) ? /* @__PURE__ */ React.createElement("div", { style: { position: "relative", paddingTop: "56.25%" } }, /* @__PURE__ */ React.createElement(
    "iframe",
    {
      src: youtubeEmbedUrl(item.content),
      title: item.title,
      allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
      allowFullScreen: true,
      style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 8 }
    }
  )) : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: C.danger } }, "YouTube\u306EURL\u3068\u3057\u3066\u8A8D\u8B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F")));
}
function HealthInfoTab({ items, onAdd, onUpdate, onDelete }) {
  const [activeType, setActiveType] = useState("note");
  const [form, setForm] = useState(emptyHealthForm());
  const [editingId, setEditingId] = useState(null);
  const selectTab = (k) => {
    setActiveType(k);
    setForm(emptyHealthForm());
    setEditingId(null);
    setForm((f) => ({ ...f, type: k }));
  };
  const submit = () => {
    if (!form.title.trim()) return;
    const payload = { ...form, type: activeType };
    if (editingId) {
      onUpdate(editingId, payload);
    } else {
      onAdd(payload);
    }
    setForm({ ...emptyHealthForm(), type: activeType });
    setEditingId(null);
  };
  const startEdit = (item) => {
    setForm({ title: item.title, type: item.type, content: item.content });
    setEditingId(item.id);
    setActiveType(item.type);
  };
  const cancelEdit = () => {
    setForm({ ...emptyHealthForm(), type: activeType });
    setEditingId(null);
  };
  const filteredItems = items.filter((it) => it.type === activeType);
  const typeTabs = [
    { k: "note", label: "\u30E1\u30E2" },
    { k: "webpage", label: "Web" },
    { k: "youtube", label: "\u52D5\u753B" }
  ];
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, typeTabs.map((t) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: t.k,
      onClick: () => selectTab(t.k),
      style: {
        border: "none",
        background: activeType === t.k ? C.accent : C.surfaceMuted,
        color: activeType === t.k ? "#fff" : C.text,
        borderRadius: 8,
        padding: "7px 14px",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer"
      }
    },
    t.label
  ))), /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.1rem" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, marginBottom: 10 } }, editingId ? `${typeTabs.find((t) => t.k === activeType).label}\u3092\u7DE8\u96C6` : `${typeTabs.find((t) => t.k === activeType).label}\u3092\u8FFD\u52A0`), /* @__PURE__ */ React.createElement("input", { placeholder: "\u30BF\u30A4\u30C8\u30EB", value: form.title, onChange: (e) => setForm({ ...form, title: e.target.value }), style: { ...inputStyle, width: "100%", marginBottom: 8 } }), activeType === "note" ? /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: form.content,
      onChange: (e) => setForm({ ...form, content: e.target.value }),
      placeholder: "AI\u306B\u89E3\u6790\u3057\u3066\u3082\u3089\u3063\u305F\u5185\u5BB9\u306A\u3069\u3092\u8CBC\u308A\u4ED8\u3051",
      style: { width: "100%", height: 120, fontSize: 13, padding: 8, border: `0.5px solid ${C.border}`, borderRadius: 8, marginBottom: 10 }
    }
  ) : /* @__PURE__ */ React.createElement(
    "input",
    {
      placeholder: activeType === "youtube" ? "YouTube\u306EURL" : "Web\u30DA\u30FC\u30B8\u306EURL",
      value: form.content,
      onChange: (e) => setForm({ ...form, content: e.target.value }),
      style: { ...inputStyle, width: "100%", marginBottom: 10 }
    }
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement(Btn, { primary: true, onClick: submit }, editingId ? "\u66F4\u65B0\u3059\u308B" : "\u8FFD\u52A0\u3059\u308B"), editingId && /* @__PURE__ */ React.createElement(Btn, { onClick: cancelEdit }, "\u30AD\u30E3\u30F3\u30BB\u30EB"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } }, filteredItems.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: C.textMuted } }, "\u307E\u3060\u4F55\u3082\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002") : filteredItems.map((item) => /* @__PURE__ */ React.createElement(HealthInfoCard, { key: item.id, item, onEdit: () => startEdit(item), onDelete: () => onDelete(item.id) }))));
}
function fmtRange(range, unit) {
  if (!range) return "\u8A2D\u5B9A\u306A\u3057";
  const parts = [];
  if (range.min != null) parts.push(`\u76EE\u6A19${range.min}${unit}\u4EE5\u4E0A`);
  if (range.max != null) parts.push(`\u4E0A\u9650${range.max}${unit}\u4EE5\u5185`);
  return parts.length ? parts.join("\u30FB") : "\u8A2D\u5B9A\u306A\u3057";
}
function buildMarkdown(iso, day, target, weights) {
  var _a;
  const lines = [];
  lines.push(`# ${fmtJP(iso)} \u98DF\u4E8B\u8A18\u9332`);
  lines.push("");
  lines.push(`- \u4F53\u91CD: ${(_a = day.weight) != null ? _a : "\u672A\u8A18\u9332"}kg${weights.prev != null ? `(\u524D\u65E5\u6BD4 ${(day.weight - weights.prev).toFixed(1)})` : ""}`);
  lines.push(`- \u30EA\u30D5\u30A3\u30FC\u30C9\u30C7\u30A4: ${day.refeed ? "\u306F\u3044" : "\u3044\u3044\u3048"}`);
  lines.push("");
  const dayTotal = { kcal: 0, p: 0, f: 0, c: 0, salt: 0 };
  day.slots.forEach((s) => {
    lines.push(`## ${s.id}`);
    if (s.items.length === 0) lines.push("(\u8A18\u9332\u306A\u3057)");
    s.items.forEach((it) => {
      if (it.confirmed) {
        lines.push(`- ${it.name}: ${it.kcal}kcal / P${it.p}g / \u8102${it.f}g / \u70AD${it.c}g / \u5869${it.salt}g`);
        dayTotal.kcal += it.kcal;
        dayTotal.p += it.p;
        dayTotal.f += it.f;
        dayTotal.c += it.c;
        dayTotal.salt += it.salt;
      } else {
        lines.push(`- ${it.name}(\u6804\u990A\u7D20\u672A\u78BA\u5B9A)`);
      }
    });
    lines.push("");
  });
  lines.push("## \u4E00\u65E5\u306E\u5408\u8A08");
  lines.push(`- kcal: ${Math.round(dayTotal.kcal * 10) / 10} / ${fmtRange(target.kcal, "kcal")}`);
  lines.push(`- \u30BF\u30F3\u30D1\u30AF\u8CEA: ${Math.round(dayTotal.p * 10) / 10}g / ${fmtRange(target.p, "g")}`);
  lines.push(`- \u8102\u8CEA: ${Math.round(dayTotal.f * 10) / 10}g / ${fmtRange(target.f, "g")}`);
  lines.push(`- \u70AD\u6C34\u5316\u7269: ${Math.round(dayTotal.c * 10) / 10}g / ${fmtRange(target.c, "g")}`);
  lines.push(`- \u5869\u5206: ${Math.round(dayTotal.salt * 10) / 10}g / ${fmtRange(target.salt, "g")}`);
  return lines.join("\n");
}
function App() {
  var _a;
  const [tab, setTab] = useState("log");
  const [iso, setIso] = useState(fmtISO(/* @__PURE__ */ new Date()));
  const [foods, setFoods] = useState(null);
  const [target, setTarget] = useState(null);
  const [categoryOrder, setCategoryOrder] = useState(null);
  const [day, setDay] = useState(null);
  const [weights, setWeights] = useState({ prev: null, prev2: null });
  const [clip, setClip] = useState(null);
  const [healthInfo, setHealthInfo] = useState(null);
  const [md, setMd] = useState("");
  const [showMd, setShowMd] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [summaryRequest, setSummaryRequest] = useState(null);
  useEffect(() => {
    (async () => {
      let f = await loadJSON("foods", null);
      if (!f) {
        f = DEFAULT_FOODS;
        await saveJSON("foods", f);
      }
      setFoods(f);
      let t = await loadJSON("settings", null);
      const DEFAULT_TARGET = {
        kcal: { min: 1600, max: null },
        p: { min: 70, max: null },
        f: { min: 50, max: null },
        c: { min: 170, max: null },
        salt: { min: null, max: 7 }
      };
      if (!t) {
        t = DEFAULT_TARGET;
        await saveJSON("settings", t);
      } else {
        let migrated = false;
        const next = { ...t };
        for (const key of ["kcal", "p", "f", "c", "salt"]) {
          if (typeof next[key] === "number") {
            next[key] = { min: null, max: next[key] };
            migrated = true;
          } else if (next[key] == null) {
            next[key] = DEFAULT_TARGET[key];
            migrated = true;
          }
        }
        if (migrated) {
          t = next;
          await saveJSON("settings", t);
        }
      }
      setTarget(t);
      let co = await loadJSON("categoryOrder", null);
      if (!co) {
        co = mergedTagList(f, CATEGORY_ORDER);
        await saveJSON("categoryOrder", co);
      }
      setCategoryOrder(co);
      const c = await loadJSON("clip", null);
      setClip(c);
      let hi = await loadJSON("healthInfo", null);
      if (!hi) {
        hi = [];
        await saveJSON("healthInfo", hi);
      }
      setHealthInfo(hi);
    })();
  }, []);
  useEffect(() => {
    (async () => {
      const d = await loadJSON(`log:${iso}`, null);
      setDay(d ? { aiNote: "", training: "", ...d } : emptyDay());
      const y1 = await loadJSON(`log:${addDays(iso, -1)}`, null);
      const y2 = await loadJSON(`log:${addDays(iso, -2)}`, null);
      setWeights({ prev: y1 && y1.weight != null ? y1.weight : null, prev2: y2 && y2.weight != null ? y2.weight : null });
    })();
  }, [iso]);
  const persistDay = useCallback(
    (newDay) => {
      setDay(newDay);
      saveJSON(`log:${iso}`, newDay);
    },
    [iso]
  );
  const withTotals = useMemo(() => {
    if (!day) return null;
    const slots = day.slots.map((s) => {
      const totals = { kcal: 0, p: 0, f: 0, c: 0, salt: 0 };
      s.items.forEach((it) => {
        if (it.confirmed) {
          totals.kcal += it.kcal;
          totals.p += it.p;
          totals.f += it.f;
          totals.c += it.c;
          totals.salt += it.salt;
        }
      });
      return { ...s, totals };
    });
    return slots;
  }, [day]);
  if (!foods || !target || !categoryOrder || !healthInfo || !day || !withTotals) {
    return /* @__PURE__ */ React.createElement("div", { style: { padding: 30, color: C.textMuted, fontFamily: "'Zen Kaku Gothic New','Noto Sans JP',sans-serif" } }, "\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026");
  }
  const unconfirmedTotal = day.slots.reduce((a, s) => a + s.items.filter((it) => !it.confirmed).length, 0);
  const addSlot = () => persistDay(dayAddSlot(day));
  const removeSlot = (id) => persistDay(dayRemoveSlot(day, id));
  const copySlot = (id) => {
    const items = daySlotItems(day, id);
    setClip(items);
    saveJSON("clip", items);
    setCopyMsg(`${id}\u3092\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F`);
    setTimeout(() => setCopyMsg(""), 1500);
  };
  const pasteSlot = (id) => {
    if (!clip || clip.length === 0) return;
    persistDay(dayPasteSlot(day, id, clip));
  };
  const addFood = (slotId, f) => persistDay(dayAddFood(day, slotId, f));
  const addUnconfirmed = (slotId, name) => persistDay(dayAddUnconfirmed(day, slotId, name));
  const removeItem = (slotId, itemId) => persistDay(dayRemoveItem(day, slotId, itemId));
  const exportAllData = async () => {
    const logs = {};
    try {
      const listRes = await window.storage.list("log:", false);
      const keys = listRes && listRes.keys || [];
      for (const k of keys) {
        try {
          const r = await window.storage.get(k, false);
          if (r) logs[k.replace(/^log:/, "")] = JSON.parse(r.value);
        } catch (e) {
        }
      }
    } catch (e) {
    }
    return JSON.stringify({ foods, settings: target, categoryOrder, healthInfo, logs });
  };
  const importAllData = async (jsonText) => {
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch (e) {
      return { error: "JSON\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002\u66F8\u304D\u51FA\u3057\u305F\u5185\u5BB9\u3092\u305D\u306E\u307E\u307E\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\u3002" };
    }
    if (Array.isArray(data.foods)) {
      setFoods(data.foods);
      await saveJSON("foods", data.foods);
    }
    if (data.settings) {
      setTarget(data.settings);
      await saveJSON("settings", data.settings);
    }
    if (Array.isArray(data.categoryOrder)) {
      setCategoryOrder(data.categoryOrder);
      await saveJSON("categoryOrder", data.categoryOrder);
    }
    if (Array.isArray(data.healthInfo)) {
      setHealthInfo(data.healthInfo);
      await saveJSON("healthInfo", data.healthInfo);
    }
    let count = 0;
    if (data.logs && typeof data.logs === "object") {
      for (const [date, log] of Object.entries(data.logs)) {
        await saveJSON(`log:${date}`, log);
        count++;
      }
    }
    const refreshed = await loadJSON(`log:${iso}`, null);
    setDay(refreshed ? { aiNote: "", training: "", ...refreshed } : emptyDay());
    return { ok: true, count };
  };
  const importData = async (arr) => {
    let ok = 0, fail = 0;
    for (const entry of arr) {
      try {
        const { date, ...rest } = entry;
        if (!date) {
          fail++;
          continue;
        }
        const existing = await loadJSON(`log:${date}`, null) || emptyDay();
        const merged = {
          weight: rest.weight != null ? rest.weight : existing.weight,
          refeed: rest.refeed != null ? !!rest.refeed : existing.refeed,
          aiNote: rest.aiNote != null ? rest.aiNote : existing.aiNote || "",
          training: rest.training != null ? rest.training : existing.training || "",
          slots: Array.isArray(rest.slots) && rest.slots.length > 0 ? rest.slots : existing.slots
        };
        await saveJSON(`log:${date}`, merged);
        ok++;
      } catch (e) {
        fail++;
      }
    }
    return { ok, fail };
  };
  const addNewFoodToMaster = async (f) => {
    const updated = [...foods, f];
    setFoods(updated);
    await saveJSON("foods", updated);
  };
  const importFoodsBulk = async (parsedFoods) => {
    let added = 0, updated = 0;
    let current = foods;
    for (const nf of parsedFoods) {
      const idx = current.findIndex((f) => f.n === nf.n);
      if (idx >= 0) {
        current = current.map((f, i) => i === idx ? nf : f);
        updated++;
      } else {
        current = [...current, nf];
        added++;
      }
    }
    setFoods(current);
    await saveJSON("foods", current);
    return { added, updated };
  };
  const updateFood = async (originalName, newFood) => {
    const updatedFoods = foods.map((f) => f.n === originalName ? newFood : f);
    setFoods(updatedFoods);
    await saveJSON("foods", updatedFoods);
    try {
      const listRes = await window.storage.list("log:", false);
      const keys = listRes && listRes.keys || [];
      for (const k of keys) {
        let res;
        try {
          res = await window.storage.get(k, false);
        } catch (e) {
          continue;
        }
        if (!res) continue;
        let d;
        try {
          d = JSON.parse(res.value);
        } catch (e) {
          continue;
        }
        let changed = false;
        d.slots = (d.slots || []).map((s) => ({
          ...s,
          items: (s.items || []).map((it) => {
            if (it.name === originalName) {
              changed = true;
              return { ...it, name: newFood.n, kcal: newFood.k, p: newFood.p, f: newFood.f, c: newFood.c, salt: newFood.s, confirmed: true };
            }
            return it;
          })
        }));
        if (changed) {
          await window.storage.set(k, JSON.stringify(d), false);
        }
      }
    } catch (e) {
    }
    const refreshed = await loadJSON(`log:${iso}`, null);
    if (refreshed) setDay(refreshed);
  };
  const addCategory = async (t) => {
    if (categoryOrder.includes(t)) return;
    const updated = [...categoryOrder, t];
    setCategoryOrder(updated);
    await saveJSON("categoryOrder", updated);
  };
  const saveCategoryOrder = async (order) => {
    setCategoryOrder(order);
    await saveJSON("categoryOrder", order);
  };
  const addHealthInfo = async (item) => {
    const updated = [...healthInfo, { id: newItemId(), ...item }];
    setHealthInfo(updated);
    await saveJSON("healthInfo", updated);
  };
  const updateHealthInfo = async (id, item) => {
    const updated = healthInfo.map((h) => h.id === id ? { ...h, ...item } : h);
    setHealthInfo(updated);
    await saveJSON("healthInfo", updated);
  };
  const deleteHealthInfo = async (id) => {
    const updated = healthInfo.filter((h) => h.id !== id);
    setHealthInfo(updated);
    await saveJSON("healthInfo", updated);
  };
  const orderedSlots = [...withTotals].reverse();
  const orderedIndexOf = (id) => withTotals.findIndex((s) => s.id === id);
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Zen Kaku Gothic New','Noto Sans JP',sans-serif", color: C.text, background: C.bg, padding: 18, borderRadius: 14 } }, /* @__PURE__ */ React.createElement("style", null, `input, select, button, textarea { font-family: inherit; }
        input, select, textarea { background: ${C.surface}; color: ${C.text}; }
        input::placeholder, textarea::placeholder { color: ${C.textMuted}; opacity: 1; }
        input:focus, select:focus, textarea:focus { outline: 2px solid ${C.accent}; outline-offset: 1px; }
      `), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 16 } }, [
    { k: "log", label: "\u30DB\u30FC\u30E0" },
    { k: "foods", label: "\u98DF\u54C1DB" },
    { k: "calendar", label: "\u30AB\u30EC\u30F3\u30C0\u30FC" },
    { k: "summary", label: "\u30B5\u30DE\u30EA\u30FC" },
    { k: "health", label: "\u30E1\u30C7\u30A3\u30A2" },
    { k: "settings", label: "\u8A2D\u5B9A" },
    { k: "import", label: "\u30C7\u30FC\u30BF\u53D6\u308A\u8FBC\u307F" }
  ].map((t) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: t.k,
      onClick: () => setTab(t.k),
      style: {
        border: "none",
        background: tab === t.k ? C.accent : C.surfaceMuted,
        color: tab === t.k ? "#fff" : C.text,
        borderRadius: 8,
        padding: "7px 14px",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer"
      }
    },
    t.label
  ))), tab === "settings" && /* @__PURE__ */ React.createElement(
    SettingsTab,
    {
      target,
      onSave: async (t) => {
        setTarget(t);
        await saveJSON("settings", t);
      },
      categoryOrder,
      foods,
      onSaveCategoryOrder: saveCategoryOrder
    }
  ), tab === "foods" && /* @__PURE__ */ React.createElement(FoodsTab, { foods, categoryOrder, onAdd: addNewFoodToMaster, onUpdate: updateFood, onImportMany: importFoodsBulk, onAddCategory: addCategory }), tab === "calendar" && /* @__PURE__ */ React.createElement(
    CalendarTab,
    {
      target,
      todayIso: fmtISO(/* @__PURE__ */ new Date()),
      onOpenInHome: (dateIso) => {
        setIso(dateIso);
        setTab("log");
      },
      onViewSummary: (monthIso) => {
        setSummaryRequest({ mode: "month", anchor: monthIso, token: Date.now() });
        setTab("summary");
      }
    }
  ), tab === "summary" && /* @__PURE__ */ React.createElement(SummaryTab, { target, todayIso: fmtISO(/* @__PURE__ */ new Date()), requestedPeriod: summaryRequest }), tab === "health" && /* @__PURE__ */ React.createElement(HealthInfoTab, { items: healthInfo, onAdd: addHealthInfo, onUpdate: updateHealthInfo, onDelete: deleteHealthInfo }), tab === "import" && /* @__PURE__ */ React.createElement(ImportTab, { onImport: importData, onExportAll: exportAllData, onImportAll: importAllData }), tab === "log" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem 1.1rem", display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement(IconBtn, { label: "\u524D\u65E5", onClick: () => setIso(addDays(iso, -1)) }, "\u2190"), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600, fontSize: 15 } }, fmtJP(iso)), /* @__PURE__ */ React.createElement(IconBtn, { label: "\u7FCC\u65E5", onClick: () => setIso(addDays(iso, 1)) }, "\u2192")), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.textMuted, cursor: "pointer" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: day.refeed, onChange: (e) => persistDay({ ...day, refeed: e.target.checked }) }), "\u30EA\u30D5\u30A3\u30FC\u30C9\u30C7\u30A4")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 10 } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 13, color: C.textMuted } }, "\u4F53\u91CD"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      value: (_a = day.weight) != null ? _a : "",
      onChange: (e) => persistDay({ ...day, weight: e.target.value === "" ? null : parseFloat(e.target.value) }),
      style: { ...inputStyle, width: 70 }
    }
  ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: C.textMuted } }, "kg"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12.5, color: C.textMuted } }, "\u524D\u65E5", " ", weights.prev != null ? /* @__PURE__ */ React.createElement(React.Fragment, null, weights.prev, "kg", " ", day.weight != null && /* @__PURE__ */ React.createElement("span", { style: { color: day.weight - weights.prev > 0 ? C.danger : C.success } }, "(", day.weight - weights.prev >= 0 ? "+" : "", (day.weight - weights.prev).toFixed(1), ")")) : "\u8A18\u9332\u306A\u3057", " ", "\u524D\u3005\u65E5", " ", weights.prev2 != null ? /* @__PURE__ */ React.createElement(React.Fragment, null, weights.prev2, "kg", " ", day.weight != null && /* @__PURE__ */ React.createElement("span", { style: { color: day.weight - weights.prev2 > 0 ? C.danger : C.success } }, "(", day.weight - weights.prev2 >= 0 ? "+" : "", (day.weight - weights.prev2).toFixed(1), ")")) : "\u8A18\u9332\u306A\u3057")), /* @__PURE__ */ React.createElement(NutrientBars, { totals: null, target, slots: withTotals })), /* @__PURE__ */ React.createElement(Btn, { wide: true, onClick: addSlot }, "+ \u65B0\u3057\u3044\u98DF\u4E8B\u67A0\u3092\u8FFD\u52A0(", nextSlotId(day.slots), ")"), copyMsg && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: C.accent } }, copyMsg), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } }, orderedSlots.map((s) => /* @__PURE__ */ React.createElement(
    SlotCard,
    {
      key: s.id,
      slot: s,
      index: orderedIndexOf(s.id),
      foods,
      categoryOrder,
      onCopy: () => copySlot(s.id),
      onPaste: () => pasteSlot(s.id),
      onRemoveSlot: () => removeSlot(s.id),
      onAddFood: (f) => addFood(s.id, f),
      onAddUnconfirmed: (n) => addUnconfirmed(s.id, n),
      onRemoveItem: (itemId) => removeItem(s.id, itemId)
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "0.9rem 1.1rem" } }, /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => setNoteOpen((v) => !v),
      style: { display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }
    },
    /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600, fontSize: 13 } }, "AI\u89E3\u6790\u30E1\u30E2", day.aiNote ? "" : "(\u672A\u8A18\u5165)"),
    /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: C.textMuted } }, noteOpen ? "\u25B2 \u9589\u3058\u308B" : "\u25BC \u958B\u304F")
  ), noteOpen && /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: day.aiNote || "",
      onChange: (e) => persistDay({ ...day, aiNote: e.target.value }),
      placeholder: "AI\u306B\u89E3\u6790\u3057\u3066\u3082\u3089\u3063\u305F\u5185\u5BB9\u3092\u3053\u3053\u306B\u8CBC\u308A\u4ED8\u3051\u3066\u6B8B\u3057\u3066\u304A\u3051\u307E\u3059",
      style: { width: "100%", height: 160, fontSize: 12.5, padding: 8, border: `0.5px solid ${C.border}`, borderRadius: 8, resize: "vertical", marginTop: 10 }
    }
  )), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        background: C.surface,
        border: `0.5px solid ${C.border}`,
        borderRadius: 12,
        padding: "0.8rem 1.1rem",
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between"
      }
    },
    unconfirmedTotal > 0 ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: C.warnText } }, "\u26A0 \u672A\u78BA\u5B9A\u306E\u98DF\u54C1\u304C", unconfirmedTotal, "\u4EF6\u3042\u308A\u307E\u3059") : /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: C.textMuted } }, "\u672A\u78BA\u5B9A\u306E\u98DF\u54C1\u306F\u3042\u308A\u307E\u305B\u3093"),
    /* @__PURE__ */ React.createElement(
      Btn,
      {
        small: true,
        onClick: () => {
          setMd(buildMarkdown(iso, day, target, weights));
          setShowMd(true);
        }
      },
      "Markdown\u51FA\u529B"
    )
  ), showMd && /* @__PURE__ */ React.createElement("div", { style: { background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "1rem" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600, fontSize: 13 } }, "Markdown\u51FA\u529B"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, /* @__PURE__ */ React.createElement(
    Btn,
    {
      small: true,
      onClick: () => {
        var _a2;
        (_a2 = navigator.clipboard) == null ? void 0 : _a2.writeText(md);
      }
    },
    "\u30B3\u30D4\u30FC"
  ), /* @__PURE__ */ React.createElement(Btn, { small: true, onClick: () => setShowMd(false) }, "\u9589\u3058\u308B"))), /* @__PURE__ */ React.createElement("textarea", { readOnly: true, value: md, style: { width: "100%", height: 220, fontSize: 12, fontFamily: "monospace", padding: 8, border: `0.5px solid ${C.border}`, borderRadius: 8 } }))));
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
