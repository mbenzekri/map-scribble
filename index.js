import 'ol/ol.css';
import { getUid } from 'ol/util.js';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import { OSM, TileDebug, XYZ, Raster } from 'ol/source';
import CanvasTileLayerRenderer from 'ol/renderer/canvas/TileLayer.js'

const mapcolor = new window.Map()

const xyz = new XYZ({
    url: 'https://mbenzekri.github.io/frcommunes/fr/communes/{z}/{x}/{y}.png',
    maxZoom: 12,
    minZoom: 5,
    crossOrigin: 'anonymous',
    tileSize: 256,
    transition: 0,
    opaque: false
})

const rastersource = new Raster({
    sources: [xyz],
    operation: function (pixels, data) {
        const pixel = pixels[0]
        if (pixel[3] === 0) return pixel
        const hcolor = ((pixel[0] * 256) + pixel[1]) * 256 + pixel[2]
        const key = parseInt(hcolor.toString(16), 10).toString().padStart(6, '0')
        let color = mapcolor.get(key)
        if (!color) {
            const r = Math.ceil(Math.random() * 256)
            const g = Math.ceil(Math.random() * 256)
            const b = Math.ceil(Math.random() * 256)
            color = [r, g, b, pixel[3]]
            mapcolor.set(key, color)
        }
        return color
    },
    threads: 0
})

const thematiclayer = new ImageLayer({
    source: rastersource,
    transition: 0
})

const debuglayer = new TileLayer({
    source: new TileDebug(),
    visible: false
})

const map = new Map({
    layers: [
        new TileLayer({
            source: new OSM()
        }),
        thematiclayer,
        debuglayer
    ],
    target: 'map',
    view: new View({
        center: [260000, 6250000],
        zoom: 5,
        zoomFactor: 2
    })
})

thematiclayer.on('prerender', evt => {
})

CanvasTileLayerRenderer.prototype.drawTileImage = function (tile, frameState, x, y, w, h, gutter, transition, opacity) {
    var image = this.getTileImage(tile);
    if (!image) {
        return;
    }
    var uid = getUid(this);
    var tileAlpha = transition ? tile.getAlpha(uid, frameState.time) : 1;
    var alpha = opacity * tileAlpha;
    var alphaChanged = alpha !== this.context.globalAlpha;
    if (alphaChanged) {
        this.context.save();
        this.context.globalAlpha = alpha;
    }
    // --------------------------------------------- MY CHANGE
    this.context.imageSmoothingEnabled = false
    // --------------------------------------------- MY CHANGE
    this.context.drawImage(image, gutter, gutter, image.width - 2 * gutter, image.height - 2 * gutter, x, y, w, h);
    if (alphaChanged) {
        this.context.restore();
    }
    if (tileAlpha !== 1) {
        frameState.animate = true;
    }
    else if (transition) {
        tile.endTransition(uid);
    }
}

function bindInputs(layerid, layer) {
    const debugcheck = document.getElementById('debugcheck')
    const thematiccheck = document.getElementById('thematiccheck')

    var visibilityInput = $(layerid + ' input.visible');
    visibilityInput.on('change', function () {
        layer.setVisible(this.checked);
    });
    visibilityInput.prop('checked', layer.getVisible());

    var opacityInput = $(layerid + ' input.opacity');
    opacityInput.on('input change', function () {
        layer.setOpacity(parseFloat(this.value));
    });
    opacityInput.val(String(layer.getOpacity()));
}
