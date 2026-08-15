export function createAssetLoader(sources, gameAssets = {}) {
  const assets = {};

  function load(name) {
    if (assets[name]) return assets[name];
    const img = new Image();
    img.decoding = "async";
    img.src = sources[name];
    assets[name] = img;
    return img;
  }

  function loadGame(id) {
    (gameAssets[id] || []).forEach(load);
  }

  return { assets, load, loadGame };
}
